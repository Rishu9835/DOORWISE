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