import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { staffUpdateSchema } from "@/lib/validators";
import { Staff } from "@/models";

export const PUT = handle(async (req: NextRequest, { params }) => {
  await requireAuth("ADMIN");
  const id = oid((await params).id);
  const d = await parseBody(req, staffUpdateSchema);
  const s = await Staff.findByIdAndUpdate(id, d, { new: true }).lean();
  if (!s) throw new ApiError(404, "Staff member not found");
  return ok(plain(s), "Staff updated");
});
