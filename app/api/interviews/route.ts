import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { interviewCreateSchema } from "@/lib/validators";
import { changeStatus } from "@/lib/applications";
import { audit, notify } from "@/lib/notify";
import { Application, Interview } from "@/models";

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAuth("ADMIN");
  const d = await parseBody(req, interviewCreateSchema);
  const app = await Application.findById(oid(d.applicationId)).populate("positionId", "title");
  if (!app) throw new ApiError(404, "Application not found");
  if (!["SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(app.status)) throw new ApiError(409, "Shortlist the candidate before scheduling an interview");
  if (d.type === "IN_PERSON" && !d.location) throw new ApiError(422, "Add a location for in-person interviews");
  if (d.type === "VIDEO" && !d.meetingLink) throw new ApiError(422, "Add a meeting link for video interviews");

  const rescheduled = app.status === "INTERVIEW_SCHEDULED";
  if (rescheduled) await Interview.updateMany({ applicationId: app._id, status: "SCHEDULED" }, { status: "RESCHEDULED" });
  const iv = await Interview.create({ ...d, applicationId: app._id, candidateId: app.candidateId, positionId: app.positionId._id, date: new Date(d.date) });
  if (!rescheduled) await changeStatus(app as never, "INTERVIEW_SCHEDULED", admin._id, app.positionId.title, "Interview scheduled", { skipCheck: true });
  await notify(app.candidateId, rescheduled ? "Interview updated" : "Interview scheduled", `Your interview for ${app.positionId.title} is on ${new Date(d.date).toDateString()} at ${d.time}.`, "INTERVIEW");
  if (rescheduled) await audit(admin._id, "Interview scheduled", "Interview", iv._id, `Rescheduled: ${app.positionId.title}`);
  return ok(plain(iv), "Interview scheduled", 201);
});

// Candidate: own interviews. Admin: all (optionally ?status=SCHEDULED).
export const GET = handle(async (req: NextRequest) => {
  const user = await requireAuth();
  const f: Record<string, unknown> = user.role === "ADMIN" ? {} : { candidateId: user._id };
  const status = req.nextUrl.searchParams.get("status");
  if (status) f.status = status;
  const items = await Interview.find(f).sort({ date: -1 }).limit(100).populate("positionId", "title").populate("candidateId", "name").lean();
  return ok({ items: plain(items) });
});
