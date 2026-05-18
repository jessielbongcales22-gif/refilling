// ─── OTP Service ──────────────────────────────────────────────────────────────
// Handles generating, storing, verifying, and simulating sending OTPs.
// Removed @emailjs/browser dependency for frontend-only simulation.
// In production, integrate a backend (Node.js + nodemailer/Twilio) for real emails/SMS.
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

// Simulate sending OTP via Email (console log only)
export async function sendEmailOTP(email: string, name: string, otp: string): Promise<{ success: boolean; simulated: boolean }> {
  console.log(`%c📧 OTP for ${email}: ${otp}`, 'background:#1e40af;color:white;padding:4px 8px;border-radius:4px;font-size:14px;');
  return { success: true, simulated: true };
}

// Simulate sending OTP via SMS (console log only)
// Real SMS requires a backend with Twilio/Semaphore/etc.
export async function sendSmsOTP(phone: string, otp: string): Promise<{ success: boolean; simulated: boolean }> {
  console.log(`%c📱 SMS OTP for ${phone}: ${otp}`, 'background:#059669;color:white;padding:4px 8px;border-radius:4px;font-size:14px;');
  return { success: true, simulated: true };
}
