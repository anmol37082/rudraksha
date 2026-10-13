import bcrypt from "bcryptjs";
import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { connectDB } from "@/lib/mongodb";
import { setSessionCookie, signToken } from "@/lib/auth";
import { User } from "@/models";

// Generated once per process (lazily, on first login attempt) so a cold start pays no bcrypt cost.
let dummyHash: string | null = null;
function dummyHashFor() {
  dummyHash ??= bcrypt.hashSync("not-a-real-password", 12);
  return dummyHash;
}

export const POST = handle(async (req) => {
  const d = await parseBody(req, loginSchema);
  await connectDB();
  const user = await User.findOne({ email: d.email }).select("+passwordHash");
  const valid = await bcrypt.compare(d.password, user?.passwordHash ?? dummyHashFor());
  if (!user || !valid) throw new ApiError(401, "Incorrect email or password");
  if (!user.isActive) throw new ApiError(403, "This account has been deactivated. Please contact us.");
  if (d.adminOnly && user.role !== "ADMIN") throw new ApiError(403, "This login is for administrators only");
  await setSessionCookie(signToken({ id: String(user._id), role: user.role, name: user.name }));
  return ok({ role: user.role }, "Logged in");
});
