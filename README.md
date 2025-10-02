# Robotics Club Door Lock System - Frontend

A modern, responsive web interface for the Robotics Club Door Lock System.

## Features

### For Members
- **Simple Entry Logging**: Enter registration number to log entry
- **Clean Interface**: Easy-to-use mobile-friendly design
- **Real-time Feedback**: Instant confirmation of successful entries

### For Admins
- **Email Verification**: Secure admin access with OTP verification
- **Password Management**: View current passwords and generate new ones
- **Bulk Operations**: Change all member passwords with one click
- **Email Notifications**: Automatic email delivery of new passwords

## Interface Overview

### Member Section
- Registration number input with validation
- One-click entry logging
- Success/error status messages

### Admin Panel
1. **Email Verification**: Enter admin email to receive OTP
2. **OTP Verification**: Enter 6-digit code from email
3. **Admin Actions**:
   - **Update Passwords**: View current member passwords
   - **Change Passwords**: Generate and email new passwords to all members
   - **Logout**: Secure session termination

## Technical Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, gradient-based design with smooth animations
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Comprehensive error messages and validation
- **Security**: OTP-based admin authentication
- **Accessibility**: Keyboard navigation and screen reader friendly

## Usage

1. **Start the server**: The backend serves the frontend automatically
2. **Access the interface**: Navigate to `http://localhost:3000`
3. **Member Entry**: Use the top section to log entries
4. **Admin Access**: Use the admin panel for password management

## API Integration

The frontend communicates with the following backend endpoints:

- `POST /enter` - Log member entry
- `POST /verifyAdmin` - Send OTP to admin email  
- `POST /update` - Fetch current passwords
- `POST /changepassword` - Generate new passwords

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive breakpoints: 768px (tablet), 480px (mobile)

## Security Notes

- Admin OTP verification required for sensitive operations
- Passwords displayed only after verification
- Automatic session timeout for admin actions
- HTTPS recommended for production deployment

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
