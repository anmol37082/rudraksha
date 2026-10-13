import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { CandidateProfile, PendingRegistration, User } from "@/models";
import { verifyRegistrationOtpSchema } from "@/lib/validators";
import { registrationOtpMatches, REGISTRATION_OTP_MAX_ATTEMPTS } from "@/lib/verification";
import { setSessionCookie, signToken } from "@/lib/auth";

export const POST = handle(async (req) => {
  const { email, otp } = await parseBody(req, verifyRegistrationOtpSchema);
  await connectDB();
  const pending = await PendingRegistration.findOne({ email }).select("+otpHash +passwordHash");
  const now = new Date();
  if (!pending || pending.expiresAt <= now) {
    if (pending) await PendingRegistration.deleteOne({ _id: pending._id });
    throw new ApiError(400, "This code has expired. Please request a new one.");
  }
  if (pending.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect codes. Request a new verification code and try again.");
  }

  if (!registrationOtpMatches(email, otp, pending.otpHash)) {
    await PendingRegistration.updateOne(
      { _id: pending._id, otpHash: pending.otpHash, attempts: { $lt: REGISTRATION_OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } }
    );
    throw new ApiError(400, "That code is incorrect. Check it and try again.");
  }

  if (await User.exists({ email })) {
    await PendingRegistration.deleteOne({ _id: pending._id });
    throw new ApiError(409, "An account with this email already exists");
  }

  const consumed = await PendingRegistration.findOneAndDelete({
    _id: pending._id,
    otpHash: pending.otpHash,
    expiresAt: { $gt: now },
    attempts: { $lt: REGISTRATION_OTP_MAX_ATTEMPTS },
  });
  if (!consumed) throw new ApiError(400, "This code is no longer valid. Request a new verification code.");

  const user = await User.create({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    passwordHash: pending.passwordHash,
    role: "CANDIDATE",
  });
  await CandidateProfile.create({ userId: user._id });
  await setSessionCookie(signToken({ id: String(user._id), role: "CANDIDATE", name: user.name }));
  return ok({ role: "CANDIDATE" }, "Email verified and account created", 201);
});
