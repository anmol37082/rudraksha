import bcrypt from "bcryptjs";
import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { connectDB } from "@/lib/mongodb";
import { CandidateProfile, PendingRegistration, User } from "@/models";
import { sendRegistrationOtp } from "@/lib/email";
import { createRegistrationOtp, hashRegistrationOtp, REGISTRATION_OTP_RESEND_MS, REGISTRATION_OTP_TTL_MS } from "@/lib/verification";

export const POST = handle(async (req) => {
  const d = await parseBody(req, registerSchema);
  await connectDB();
  if (await User.exists({ email: d.email })) throw new ApiError(409, "An account with this email already exists");
  const now = new Date();
  const pending = await PendingRegistration.findOne({ email: d.email });
  if (pending && pending.expiresAt > now && pending.resendAvailableAt > now) {
    throw new ApiError(429, "A verification code was just sent. Please wait a minute before requesting another.");
  }

  const otp = createRegistrationOtp();
  await PendingRegistration.findOneAndUpdate(
    { email: d.email },
    { $set: {
      name: d.name,
      email: d.email,
      phone: d.phone,
      passwordHash: await bcrypt.hash(d.password, 12),
      otpHash: hashRegistrationOtp(d.email, otp),
      expiresAt: new Date(now.getTime() + REGISTRATION_OTP_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + REGISTRATION_OTP_RESEND_MS),
      attempts: 0,
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendRegistrationOtp(d.email, d.name, otp);
  } catch {
    await PendingRegistration.updateOne({ email: d.email }, { $set: { resendAvailableAt: new Date() } });
    throw new ApiError(503, "We could not send the verification email. Please try again shortly.");
  }
  return ok({ email: d.email }, "Verification code sent", 200);
});
