import bcrypt from "bcryptjs";
import { ApiError, handle, ok, parseBody, requireAuth } from "@/lib/api";
import { adminAccountSchema } from "@/lib/validators";
import { User } from "@/models";

export const PATCH = handle(async (req) => {
  const d = await parseBody(req, adminAccountSchema);
  const admin = await requireAuth("ADMIN");
  const account = await User.findById(admin._id).select("+passwordHash");
  if (!account) throw new ApiError(401, "Your account is not available");

  if (!(await bcrypt.compare(d.currentPassword, account.passwordHash))) {
    throw new ApiError(403, "Current password is incorrect");
  }

  if (d.email) account.email = d.email;
  if (d.newPassword) account.passwordHash = await bcrypt.hash(d.newPassword, 12);
  await account.save();

  return ok({ email: account.email }, "Admin account updated");
});
