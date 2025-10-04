// utils/otp.js

// Generate a 6-digit OTP
export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get expiry timestamp (default 15 minutes from now)
export function getExpiry(minutes = 15) {
  return Date.now() + minutes * 60 * 1000;
}

// Check if expiry time is already passed
export function isExpired(expiresAt) {
  return Date.now() > expiresAt;
}
