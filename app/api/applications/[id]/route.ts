import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { statusUpdateSchema } from "@/lib/validators";
import { changeStatus, forCandidate } from "@/lib/applications";
import { Application, Interview } from "@/models";

export const GET = handle(async (_req: NextRequest, { params }) => {
  const user = await requireAuth();
  const id = oid((await params).id);
  const isAdmin = user.role === "ADMIN";
  // Ownership is part of the query: a candidate can never load someone else's application.
  const app = await Application.findOne(isAdmin ? { _id: id } : { _id: id, candidateId: user._id })
    .populate("positionId", "title location")
    .populate("candidateId", "name email phone")
    .lean();
  if (!app) throw new ApiError(404, "Application not found");
  const interviews = await Interview.find({ applicationId: id }).sort({ date: -1 }).lean();
  const data = isAdmin ? app : forCandidate(app);
  return ok(plain({ ...data, interviews }));
});

// Admin only. Candidates can never change an application's status.
export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireAuth("ADMIN");
  const id = oid((await params).id);
  const d = await parseBody(req, statusUpdateSchema);
  const app = await Application.findById(id).populate("positionId", "title");
  if (!app) throw new ApiError(404, "Application not found");
  if (d.status && d.status !== app.status) {
    if (d.status === "INTERVIEW_SCHEDULED") throw new ApiError(422, "Schedule an interview to move to this step");
    // Status transition is validated/applied first; adminNotes are staged in memory and
    // persisted together with it, so a failed transition leaves no partial update.
    await changeStatus(app as never, d.status, admin._id, app.positionId.title, d.comment);
  } else if (d.status === "INTERVIEW_SCHEDULED") {
    throw new ApiError(422, "Schedule an interview to move to this step");
  }
  if (d.adminNotes !== undefined) {
    app.adminNotes = d.adminNotes;
    await app.save();
  }
  return ok(plain(await Application.findById(id).lean()), "Application updated");
});
