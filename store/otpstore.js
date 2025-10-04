// store/otpStore.js
import { isExpired } from '../utils/otp.js';

let otps = []; 
// structure: { otp, type, expiresAt, used: false }

// Save new OTP
export function saveOtp(otp, type, expiresAt) {
  otps.push({ otp, type, expiresAt, used: false });
}

// Verify OTP (check existence, type, expiry, not used yet)
export function verifyOtp(otp, type) {
  const record = otps.find(o => o.otp === otp && o.type === type);

  if (!record) return { valid: false, reason: 'Invalid OTP' };
  if (record.used) return { valid: false, reason: 'OTP already used' };
  if (isExpired(record.expiresAt)) return { valid: false, reason: 'OTP expired' };

  record.used = true; // mark OTP as consumed
  return { valid: true, record };
}

// Cleanup expired OTPs (run periodically to keep memory light)
export function cleanupOtps() {
  otps = otps.filter(o => !isExpired(o.expiresAt) && !o.used);
}
