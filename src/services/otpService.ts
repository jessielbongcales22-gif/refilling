// src/services/otpService.ts
// Clean OTP service with NO EmailJS dependency.
// This keeps AuthPage.tsx working because it still imports sendEmailOTP and sendSmsOTP.

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(key: string, otp: string): void {
  const expires = Date.now() + 10 * 60 * 1000;

  localStorage.setItem(
    `wm_otp_${key}`,
    JSON.stringify({
      otp,
      expires
    })
  );
}

export function verifyOTP(
  key: string,
  inputOtp: string
): "valid" | "invalid" | "expired" {
  try {
    const stored = localStorage.getItem(`wm_otp_${key}`);

    if (!stored) {
      return "invalid";
    }

    const { otp, expires } = JSON.parse(stored);

    if (Date.now() > expires) {
      localStorage.removeItem(`wm_otp_${key}`);
      return "expired";
    }

    if (otp === inputOtp.trim()) {
      localStorage.removeItem(`wm_otp_${key}`);
      return "valid";
    }

    return "invalid";
  } catch {
    return "invalid";
  }
}

// Dummy email sender.
// This prevents build errors without using @emailjs/browser.
export async function sendEmailOTP(
  email: string,
  name: string,
  otp: string
): Promise<{ success: boolean; simulated: boolean }> {
  console.log("Email OTP simulation:", {
    email,
    name,
    otp
  });

  return {
    success: true,
    simulated: true
  };
}

// Dummy SMS sender.
// This prevents build errors without real SMS API.
export async function sendSmsOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; simulated: boolean }> {
  console.log("SMS OTP simulation:", {
    phone,
    otp
  });

  return {
    success: true,
    simulated: true
  };
}
