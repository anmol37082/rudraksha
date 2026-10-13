import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { PendingRegistration, User } from "@/models";
import { resendRegistrationOtpSchema } from "@/lib/validators";
import { createRegistrationOtp, hashRegistrationOtp, REGISTRATION_OTP_RESEND_MS, REGISTRATION_OTP_TTL_MS } from "@/lib/verification";
import { sendRegistrationOtp } from "@/lib/email";

export const POST = handle(async (req) => {
  const { email } = await parseBody(req, resendRegistrationOtpSchema);
  await connectDB();
  if (await User.exists({ email })) throw new ApiError(409, "An account with this email already exists");

  const now = new Date();
  const pending = await PendingRegistration.findOne({ email });
  if (!pending || pending.expiresAt <= now) {
    throw new ApiError(404, "This registration has expired. Please submit the sign-up form again.");
  }
  if (pending.resendAvailableAt > now) {
    throw new ApiError(429, "Please wait a minute before requesting another code.");
  }

  const otp = createRegistrationOtp();
  const updated = await PendingRegistration.findOneAndUpdate(
    { _id: pending._id, expiresAt: { $gt: now }, resendAvailableAt: { $lte: now } },
    { $set: {
      otpHash: hashRegistrationOtp(email, otp),
      expiresAt: new Date(now.getTime() + REGISTRATION_OTP_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + REGISTRATION_OTP_RESEND_MS),
      attempts: 0,
    } },
    { new: true }
  );
  if (!updated) throw new ApiError(429, "Please wait a minute before requesting another code.");

  try {
    await sendRegistrationOtp(email, pending.name, otp);
  } catch {
    await PendingRegistration.updateOne({ _id: pending._id }, { $set: { resendAvailableAt: new Date() } });
    throw new ApiError(503, "We could not send the verification email. Please try again shortly.");
  }
  return ok({ email }, "A new verification code was sent");
});
