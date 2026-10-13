import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { candidateAdminSchema } from "@/lib/validators";
import { audit } from "@/lib/notify";
import { Application, CandidateProfile, Interview, User } from "@/models";

export const GET = handle(async (_req: NextRequest, { params }) => {
  await requireAuth("ADMIN");
  const id = oid((await params).id);
  const user = await User.findOne({ _id: id, role: "CANDIDATE" }).lean();
  if (!user) throw new ApiError(404, "Candidate not found");
  const [profile, applications, interviews] = await Promise.all([
    CandidateProfile.findOne({ userId: id }).lean(),
    Application.find({ candidateId: id }).select("-adminNotes").populate("positionId", "title").sort({ createdAt: -1 }).lean(),
    Interview.find({ candidateId: id }).populate("positionId", "title").sort({ date: -1 }).lean(),
  ]);
  return ok(plain({ user, profile, applications, interviews }));
});

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireAuth("ADMIN");
  const id = oid((await params).id);
  const { isActive } = await parseBody(req, candidateAdminSchema);
  const u = await User.findOneAndUpdate({ _id: id, role: "CANDIDATE" }, { isActive }, { new: true });
  if (!u) throw new ApiError(404, "Candidate not found");
  if (!isActive) await audit(admin._id, "Candidate deactivated", "User", id, u.name);
  return ok({ isActive: u.isActive }, isActive ? "Candidate activated" : "Candidate deactivated");
});
