import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const REGISTRATION_OTP_TTL_MS = 10 * 60 * 1000;
export const REGISTRATION_OTP_RESEND_MS = 60 * 1000;
export const REGISTRATION_OTP_MAX_ATTEMPTS = 5;

export function createRegistrationOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashRegistrationOtp(email: string, otp: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("A strong JWT_SECRET is required to protect verification codes");
  return createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
}

export function registrationOtpMatches(email: string, otp: string, hash: string) {
  const expected = Buffer.from(hashRegistrationOtp(email, otp), "hex");
  const actual = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
