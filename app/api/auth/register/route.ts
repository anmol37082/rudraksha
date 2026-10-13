import bcrypt from "bcryptjs";
import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { connectDB } from "@/lib/mongodb";
import { setSessionCookie, signToken } from "@/lib/auth";
import { CandidateProfile, User } from "@/models";

export const POST = handle(async (req) => {
  const d = await parseBody(req, registerSchema);
  await connectDB();
  if (await User.exists({ email: d.email })) throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({ name: d.name, email: d.email, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 12), role: "CANDIDATE" });
  await CandidateProfile.create({ userId: user._id });
  await setSessionCookie(signToken({ id: String(user._id), role: "CANDIDATE", name: user.name }));
  return ok({ role: "CANDIDATE" }, "Account created", 201);
});
