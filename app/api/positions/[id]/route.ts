import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, optionalAuth, parseBody, plain, requireAuth } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { findPosition } from "@/lib/data";
import { positionSchema } from "@/lib/validators";
import { audit } from "@/lib/notify";
import { Application, Position } from "@/models";
import { MANDATORY_POSITION_DOCUMENTS } from "@/lib/constants";

export const GET = handle(async (_req: NextRequest, { params }) => {
  const { id } = await params;
  const p = await findPosition(id);
  const user = await optionalAuth();
  if (!p || (p.status !== "ACTIVE" && user?.role !== "ADMIN")) throw new ApiError(404, "Position not found");
  return ok(p);
});

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireAuth("ADMIN");
  const id = oid((await params).id);
  const d = await parseBody(req, positionSchema.partial());
  const before = await Position.findById(id);
  if (!before) throw new ApiError(404, "Position not found");
  const update: Record<string, unknown> = { ...d };
  update.requiredDocuments = [...new Set([...MANDATORY_POSITION_DOCUMENTS, ...(d.requiredDocuments ?? before.requiredDocuments ?? [])])];
  if ("applicationDeadline" in d) update.applicationDeadline = d.applicationDeadline || null;
  const p = await Position.findByIdAndUpdate(id, update, { new: true });
  if (d.status === "CLOSED" && before.status !== "CLOSED") await audit(admin._id, "Position closed", "Position", id, before.title);
  return ok(plain(p), "Position updated");
});

export const DELETE = handle(async (_req: NextRequest, { params }) => {
  const admin = await requireAuth("ADMIN");
  const id = oid((await params).id);
  await connectDB();
  const p = await Position.findById(id);
  if (!p) throw new ApiError(404, "Position not found");
  if (await Application.exists({ positionId: id })) throw new ApiError(409, "This position has applications. Close it instead of deleting.");
  await p.deleteOne();
  await audit(admin._id, "Position deleted", "Position", id, p.title);
  return ok({}, "Position deleted");
});
