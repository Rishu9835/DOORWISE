import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // for making API calls
import sheets from './sheets.js';

const { appendEmailToSheet, getValueSheet, changeValueSheet, getAllValFromColumn } = sheets;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

let currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
    const { to } = req.body;
    const admins = await getAdminEmails();

    if (!to) {
        return res.status(400).send('Missing required fields: {to}');
    } else if (!admins.includes(to)) {
        return res.status(400).send('You are not an admin');
    }

    const code = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    currAdminPass = code;

    const subject = "Email Verification - Admin Robotics Club";
    const htmlContent = `
        <html>
          <body>
            <h3>Email Verification</h3>
            <p>The verification code for your email is: <b>${code}</b></p>
            <p>If you did not request this code, please ignore this email.</p>
          </body>
        </html>
    `;

    try {
        await sendEmailBrevo(to, subject, htmlContent);
        res.status(200).send(code);
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email.');
    }
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

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Get test
app.get('/get', (req, res) => {
    res.send("Hello World!");
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
app.post('/update', async (req, res) => {
    const { adminPass } = req.body;

    if (adminPass != currAdminPass) {
        return res.status(400).send('Wrong Admin Password');
    }

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

// Manual or cron-triggered password reset
app.post('/changepassword', async (req, res) => {
    console.log('Change password request received:', req.body);
    const { adminPass, cron_job_pass } = req.body;

    if (cron_job_pass && cron_job_pass === process.env.CRON_JOB_PASSWROD) {
        console.log('Cron job password change triggered');
        try {
            await changePassword();
            return res.status(200).send("Password changed successfully");
        } catch (error) {
            console.error('Cron job password change error:', error);
            return res.status(500).send("Error changing password");
        }
    }

    console.log('Admin password check - received:', adminPass, 'expected:', currAdminPass);
    if (currAdminPass !== adminPass) {
        return res.status(400).send("Wrong password");
    }

    currAdminPass = (Math.floor(Math.random() * 1000000)).toString().padStart(6, '0');
    console.log('Starting password change process...');

    try {
        await changePassword();
        console.log('Password change completed successfully');
        res.status(200).send("Password changed successfully");
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).send("Error changing password");
    }
});

//=========================//
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
