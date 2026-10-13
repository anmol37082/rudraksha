import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { interviewUpdateSchema } from "@/lib/validators";
import { changeStatus } from "@/lib/applications";
import { notify } from "@/lib/notify";
import { Application, Interview } from "@/models";

export const GET = handle(async (_req: NextRequest, { params }) => {
  const user = await requireAuth();
  const id = oid((await params).id);
  const iv = await Interview.findOne(user.role === "ADMIN" ? { _id: id } : { _id: id, candidateId: user._id }).populate("positionId", "title").lean();
  if (!iv) throw new ApiError(404, "Interview not found");
  return ok(plain(iv));
});

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireAuth("ADMIN");
  const id = oid((await params).id);
  const d = await parseBody(req, interviewUpdateSchema);
  const iv = await Interview.findById(id);
  if (!iv) throw new ApiError(404, "Interview not found");
  Object.assign(iv, d, d.date ? { date: new Date(d.date) } : {});
  await iv.save();

  const app = await Application.findById(iv.applicationId).populate("positionId", "title");
  if (app) {
    const title = app.positionId.title;
    if (d.status === "COMPLETED" && app.status === "INTERVIEW_SCHEDULED") await changeStatus(app as never, "INTERVIEWED", admin._id, title, "Interview completed");
    if (d.status === "CANCELLED" && app.status === "INTERVIEW_SCHEDULED") {
      await changeStatus(app as never, "SHORTLISTED", admin._id, title, "Interview cancelled", { skipCheck: true });
      await notify(iv.candidateId, "Interview cancelled", `Your interview for ${title} was cancelled. We will contact you with a new time.`, "INTERVIEW");
    } else if (!d.status || d.status === "SCHEDULED") {
      await notify(iv.candidateId, "Interview updated", `The details of your interview for ${title} have changed. Please check them.`, "INTERVIEW");
    }
  }
  return ok(plain(iv), "Interview updated");
});
