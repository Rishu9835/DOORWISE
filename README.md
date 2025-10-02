# Robotics Club Door Lock - Node Server

This is the backend server for the Robotics Club Door Lock system. It handles user verification, logging entries, password management, and email notifications via Brevo.

---

## Environment Variables

Make sure to set the following variables in your `.env` file:

* `EMAIL_USER` - Verified Brevo sender email.
* `EMAIL_PASS` - Email account password (if needed).
* `MEMBER_EMAIL_COL` - Spreadsheet column index for member emails.
* `MEMBER_REG_NO_COL` - Spreadsheet column index for member registration numbers.
* `MEMBER_PASSWORD_COL` - Spreadsheet column index for member passwords.
* `ADMIN_COL` - Spreadsheet column index for admin emails.
* `CRON_JOB_PASSWROD` - Password for authenticating cron job requests.
* `SPREADSHEET_ID` - Google Sheets ID used for storing data.

---

## Google Sheets API Credentials

This project requires a Google Service Account JSON key file for authenticating with the Google Sheets API. The JSON file should be stored securely (e.g., credentials.json) and used by the server to access and modify the spreadsheet.

Make sure the service account has the necessary permissions and that the spreadsheet is shared with the service account email.

## API Endpoints

### POST `/verifyAdmin`

* **Purpose:** Verify if an email belongs to an admin and send an OTP via email.
* **Request Body:** `{ "to": "<admin_email>" }`
* **Response:** Sends back the OTP code if the email is an admin; otherwise returns an error.

---

### POST `/enter`

* **Purpose:** Log a user entry by appending their registration number to the spreadsheet.
* **Request Body:** `{ "regNo": "<registration_number>" }`
* **Response:** Confirmation message on success or error.

---

### GET `/get`

* **Purpose:** Simple test endpoint.
* **Response:** Returns `"Hello World!"`.

---

### POST `/changepassword`

* **Purpose:** Change member passwords and send updated passwords via email.
* **Request Body:**

  * For admin-triggered: `{ "adminPass": "<admin_otp>" }`
  * For cron job-triggered: `{ "cron_job_pass": "<cron_password>" }`
* **Response:** Success or error message.

---

## Additional Info

* **Email Service:** Uses [Brevo (formerly Sendinblue)](https://www.brevo.com/) SMTP API to send verification and password emails.
* **Cron Job:** Password reset can be triggered automatically via a secure cron job using [cron-job.org](cron-job.org).
* **Password Logic:** New passwords are generated combining the last 4 digits of the registration number and a random 4-digit number.

---

## Running the Server

1. Install dependencies:

```bash
npm install
```

2. Create and configure the `.env` file with the required environment variables.

3. Start the server:

```bash
nodemon server.js 
```

The server will run on the port defined in `.env` or default to `3000`.
