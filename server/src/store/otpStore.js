// In-memory OTP store
// In production, replace with Redis or database
const otpStore = new Map();

export function saveOtp(phone, hashedOtp) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  otpStore.set(phone, {
    otpHash: hashedOtp,
    expiresAt,
    createdAt: new Date()
  });
}

export function getOtp(phone) {
  return otpStore.get(phone);
}

export function deleteOtp(phone) {
  otpStore.delete(phone);
}

export function isOtpExpired(phone) {
  const record = otpStore.get(phone);
  if (!record) return true;
  return new Date() > record.expiresAt;
}
