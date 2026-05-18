// ─── OTP Utility Service ──────────────────────────────────────────────────────
// Core functionality for generating, storing, and verifying OTPs in localStorage.
// All email/SMS simulation removed. Frontend only.
// ──────────────────────────────────────────────────────────────────────────────

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with 10-minute expiry
export function storeOTP(key: string, otp: string) {
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  localStorage.setItem(`wm_otp_${key}`, JSON.stringify({ otp, expires }));
}

// Verify OTP
export function verifyOTP(key: string, inputOtp: string): 'valid' | 'invalid' | 'expired' {
  try {
    const stored = localStorage.getItem(`wm_otp_${key}`);
    if (!stored) return 'invalid';
    const { otp, expires } = JSON.parse(stored);
    if (Date.now() > expires) {
      localStorage.removeItem(`wm_otp_${key}`);
      return 'expired';
    }
    if (otp === inputOtp.trim()) {
      localStorage.removeItem(`wm_otp_${key}`);
      return 'valid';
    }
    return 'invalid';
  } catch {
    return 'invalid';
  }
}
