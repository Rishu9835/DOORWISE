import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // for making API calls
import sheets from './sheets.js';
import { generateOtp, getExpiry } from './utils/otp.js';
import { saveOtp, verifyOtp, cleanupOtps } from './store/otpstore.js';

const { appendEmailToSheet, getValueSheet, changeValueSheet, getAllValFromColumn } = sheets;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

let currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
// store logged-in admins
// just keep a set of admin emails who are verified
const loggedInAdmins = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Get test
app.get('/get', (req, res) => {
    res.send("Hello World!");
});
//=========================//
// Helper: Send Email via Brevo
//=========================//
async function sendEmailBrevo(to, subject, htmlContent) {
    const url = "https://api.brevo.com/v3/smtp/email";

    const body = {
        sender: {
            name: "Robotics Club",
            email: process.env.EMAIL_USER   // must match a verified Brevo sender
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Brevo email failed: ${response.statusText}`);
    }

    return response.json();
}


//=========================//
// Routes
//=========================//

// Initialize admin emails (will be loaded when needed)
async function getAdminEmails() {
    try {
        const admins = await getAllValFromColumn(Number(process.env.ADMIN_COL));
        console.log('Admin emails loaded:', admins);
        return admins;
    } catch (error) {
        console.error('Failed to load admin emails:', error);
        return ['Admin', 'rishuraj9431@gmail.com']; // Fallback admins
    }
}

// Verify admin and send OTP
app.post('/verifyAdmin', async (req, res) => {
    const { email, otp } = req.body; // if otp is undefined, it's step 1
    const admins = await getAdminEmails();

    if (!email) return res.status(400).send('Missing required field: email');
    if (!admins.includes(email)) return res.status(400).send('You are not an admin');

    // Step 2: OTP is provided → verify and log in
    if (otp) {
        const result = verifyOtp(otp, 'ADMIN');
        if (!result.valid) {
            return res.status(400).send(`OTP invalid: ${result.reason}`);
        }

        loggedInAdmins.add(email); // now admin is logged in
        console.log(`Admin ${email} logged in successfully.`);
        return res.status(200).send('Admin verified and logged in.');
    }

    // Step 1: No OTP yet → generate OTP and send email
    const generatedOtp = generateOtp();
    const expiresAt = getExpiry(5); // 5 minutes
    saveOtp(generatedOtp, 'ADMIN', expiresAt);

    const subject = "Admin Verification OTP";
    const htmlContent = `
        <p>Hello Admin,</p>
        <p>Your OTP for login is: <b>${generatedOtp}</b></p>
        <p>This OTP is valid for 5 minutes.</p>
    `;

    try {
        await sendEmailBrevo(email, subject, htmlContent);
        console.log(`OTP sent to admin email: ${email}`);
        return res.status(200).send('OTP sent to admin email.');
    } catch (err) {
        console.error('Error sending OTP:', err);
        return res.status(500).send('Failed to send OTP.');
    }
});


async function requireAdmin(req, res, next) {
    const { email } = req.body;
    if (!email || !loggedInAdmins.has(email)) {
        return res.status(401).send("Unauthorized: Admin not verified");
    }
    next();
}

app.post('/admin/logout', (req, res) => {
    const { email } = req.body;
    if (!email || !loggedInAdmins.has(email)) {
        return res.status(400).send("Admin not logged in");
    }

    loggedInAdmins.delete(email);
    console.log(`Admin ${email} logged out`);
    res.status(200).send("Admin logged out successfully");
});


// Log entry
app.post('/enter', async (req, res) => {
    const { regNo } = req.body;
    try {
        await appendEmailToSheet(regNo);
        res.status(200).send("User Entered");
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error logging to sheet.');
    }
});



// Debug endpoint to check sheet data
app.get('/debug-sheet', async (req, res) => {
    try {
        const emails = await getAllValFromColumn(Number(process.env.MEMBER_EMAIL_COL));
        const regNos = await getAllValFromColumn(Number(process.env.MEMBER_REG_NO_COL));
        const passwords = await getAllValFromColumn(Number(process.env.MEMBER_PASSWORD_COL));
        const admins = await getAllValFromColumn(Number(process.env.ADMIN_COL));
        
        res.json({
            columns: {
                MEMBER_EMAIL_COL: process.env.MEMBER_EMAIL_COL,
                MEMBER_REG_NO_COL: process.env.MEMBER_REG_NO_COL,
                MEMBER_PASSWORD_COL: process.env.MEMBER_PASSWORD_COL,
                ADMIN_COL: process.env.ADMIN_COL
            },
            data: {
                emails,
                regNos, 
                passwords,
                admins
            }
        });
    } catch (error) {
        console.error('Debug sheet error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update password fetch
app.post('/update', requireAdmin, async (req, res) => {
    try {
        const currentPassword = await getAllValFromColumn(Number(process.env.MEMBER_PASSWORD_COL));
        res.status(200).send(currentPassword.join(','));
    } catch (error) {
        console.error('Error fetching current password:', error);
        res.status(500).send('Error fetching current password.');
    }
});


// Change passwords and send via email
const changePassword = async () => {
    console.log('changePassword function started');
    try {
        console.log('Fetching emails from column:', process.env.MEMBER_EMAIL_COL);
        const emails = await getAllValFromColumn(Number(process.env.MEMBER_EMAIL_COL));
        console.log('Emails retrieved:', emails);

        console.log('Fetching reg numbers from column:', process.env.MEMBER_REG_NO_COL);
        const regNos = await getAllValFromColumn(Number(process.env.MEMBER_REG_NO_COL));
        console.log('Reg numbers retrieved:', regNos);

        if (!emails || !regNos) {
            console.error('Missing data - emails or regNos is null/undefined');
            console.error('Emails:', emails, 'RegNos:', regNos);
            return;
        }

        if (emails.length === 0 || regNos.length === 0) {
            console.log('No members found in the sheet - emails or regNos is empty');
            console.log('This means there are no members to update passwords for');
            return;
        }

        if (emails.length !== regNos.length) {
            console.error('Mismatch in data length - emails and regNos arrays have different lengths');
            console.error('Emails length:', emails.length, 'RegNos length:', regNos.length);
            return;
        }

        console.log(`Processing ${emails.length} members...`);
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const regNo = regNos[i];
            console.log(`Processing member ${i + 1}: email=${email}, regNo=${regNo}`);
            
            if (!email || !regNo) {
                console.log(`Skipping member ${i + 1} - missing email or regNo`);
                continue;
            }

            const regStr = String(regNo);
            const last4 = regStr.slice(-4);
            const rand4 = Math.floor(1000 + Math.random() * 9000);
            const password = `${last4}${rand4}`;
            console.log(`Generated password for ${email}: ${password}`);

            const subject = 'Your Robotics Club Password';
            const htmlContent = `
                <html>
                  <body>
                    <p>Hello,</p>
                    <p>Your new password is: <b>${password}</b></p>
                    <p>Please keep it safe.</p>
                    <p>- Robotics Club</p>
                  </body>
                </html>
            `;

            try {
                console.log(`Sending email to ${email}...`);
                await sendEmailBrevo(email, subject, htmlContent);
                console.log(`Email sent successfully to ${email}`);
                
                console.log(`Updating sheet - row ${i}, column ${process.env.MEMBER_PASSWORD_COL}, password: ${password}`);
                await changeValueSheet(i, Number(process.env.MEMBER_PASSWORD_COL), password);
                console.log(`Sheet updated successfully for ${email}`);
            } catch (err) {
                console.error(`Failed for ${email}:`, err);
            }
        }
        console.log('changePassword function completed');
    } catch (err) {
        console.error('changePassword function error:', err);
    }
};

// Admin generates OTP for door unlock
app.post('/admin/generateDoorOtp', requireAdmin,async (req, res) => {
    try {
        // 1️⃣ Generate OTP
        const otp = generateOtp();
        const expiresAt = getExpiry(15); // 15 minutes
        saveOtp(otp, 'DOOR', expiresAt);

        // 2️⃣ Log OTP in Google Sheet (new column for door OTPs)
        // Assuming you have a helper like changeValueSheet(row, col, value)
        // We'll append to the first empty row in a specific column
        const doorOtpCol = Number(process.env.DOOR_OTP_COL); // add in .env
        const nextRow = await getAllValFromColumn(doorOtpCol).then(vals => vals.length);
        await changeValueSheet(nextRow, doorOtpCol, otp);
        console.log(`Door OTP logged in sheet at row ${nextRow}, column ${doorOtpCol}`);

        // 3️⃣ Get admin emails
        const admins = await getAdminEmails();
        const validAdmins = admins.map(e => e.trim()).filter(e => e.includes('@'));

        if (validAdmins.length === 0) {
            console.error("No valid admin emails found for door OTP.");
            return res.status(500).send("No valid admin emails found.");
        }

        // 4️⃣ Prepare email content
        const subject = 'Door Unlock OTP';
        const htmlContent = `
            <html>
              <body>
                <p>Hello Admin,</p>
                <p>Your OTP to unlock the door is: <b>${otp}</b></p>
                <p>This OTP is valid for 15 minutes.</p>
                <p>- Robotics Club</p>
              </body>
            </html>
        `;

        // 5️⃣ Send OTP email to all valid admins
        for (const email of validAdmins) {
            await sendEmailBrevo(email, subject, htmlContent);
            console.log(`Door OTP sent to admin email: ${email}`);
        }

        // 6️⃣ Schedule deletion after expiry
        setTimeout(async () => {
            console.log(`Deleting door OTP ${otp} after 15 minutes.`);
            cleanupOtps(); // remove from in-memory store
            // Remove from Google Sheet
            const sheetVals = await getAllValFromColumn(doorOtpCol);
            const rowIndex = sheetVals.indexOf(otp);
            if (rowIndex !== -1) {
                await changeValueSheet(rowIndex, doorOtpCol, '');
                console.log(`Door OTP ${otp} removed from Google Sheet row ${rowIndex}`);
            }
        }, 15 * 60 * 1000);

        return res.status(200).send("Door OTP sent to admin email(s) and logged in sheet.");

    } catch (err) {
        console.error("Error generating/sending/logging door OTP:", err);
        return res.status(500).send("Failed to generate/send/log door OTP.");
    }
});



// Door verifies OTP
app.post('/door/verifyOtp', (req, res) => {
  const { otp } = req.body;
  const result = verifyOtp(otp, 'DOOR');

  if (!result.valid) {
    return res.status(400).json({ error: result.reason });
  }

  res.json({ success: true, message: 'Door unlocked!' });
});

// Manual or cron-triggered password reset

app.post('/changepassword', requireAdmin, async (req, res) => {
    const { cron_job_pass, otp, confirm } = req.body;

    // 1️⃣ Cron job triggered password reset
    if (cron_job_pass && cron_job_pass === process.env.CRON_JOB_PASSWROD) {
        try {
            await changePassword();
            return res.status(200).send("Password changed successfully (cron job)");
        } catch (error) {
            console.error("Cron job password change error:", error);
            return res.status(500).send("Error changing password");
        }
    }

    // 2️⃣ OTP flow for manual admin-triggered password change
    if (!confirm) {
        // Generate OTP
        const generatedOtp = generateOtp();
        const expiresAt = getExpiry(5); // OTP valid for 5 minutes
        saveOtp(generatedOtp, 'RESET', expiresAt);

        // Fetch admin emails
        const admins = await getAdminEmails();
        const validAdmins = admins
            .map(e => e.trim())
            .filter(e => e.includes('@'));

        if (validAdmins.length === 0) {
            console.error("No valid admin emails found to send OTP.");
            return res.status(500).send("No valid admin emails found.");
        }

        const subject = 'OTP for Password Change';
        const htmlContent = `
            <html>
              <body>
                <p>Hello Admin,</p>
                <p>Your OTP for changing all passwords is: <b>${generatedOtp}</b></p>
                <p>This OTP is valid for 5 minutes.</p>
                <p>- Robotics Club</p>
              </body>
            </html>
        `;

        try {
            for (const email of validAdmins) {
                await sendEmailBrevo(email, subject, htmlContent);
                console.log(`OTP sent to admin email: ${email}`);
            }
            return res.status(200).send("OTP sent to admin email(s). Use it to confirm password change.");
        } catch (err) {
            console.error('Error sending OTP emails:', err);
            return res.status(500).send("Failed to send OTP email(s)");
        }
    }

    // 3️⃣ Confirm OTP and proceed to change passwords
    const result = verifyOtp(otp, 'RESET');
    if (!result.valid) {
        return res.status(400).send(`OTP invalid: ${result.reason}`);
    }

    try {
        await changePassword();
        console.log('Password change completed successfully');
        return res.status(200).send("Password changed successfully");
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).send("Error changing password");
    }
});


// every 5 minutes, purge expired/used OTPs
setInterval(cleanupOtps, 10 * 60 * 1000);


//=========================//
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
