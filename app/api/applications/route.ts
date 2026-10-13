import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain, requireAuth } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { applicationCreateSchema } from "@/lib/validators";
import { findPosition, isOpen } from "@/lib/data";
import { missingForApply } from "@/lib/profile";
import { forCandidate } from "@/lib/applications";
import { bestEffort, notify, notifyAdmins } from "@/lib/notify";
import { Application, CandidateProfile } from "@/models";
import { DOCUMENT_LABEL } from "@/lib/constants";
import { documentsForApplication } from "@/lib/application-documents";
import { APPLICATION_AGREEMENT_TERMS, APPLICATION_AGREEMENT_VERSION } from "@/lib/agreements";

export const POST = handle(async (req: NextRequest) => {
  const user = await requireAuth("CANDIDATE");
  const d = await parseBody(req, applicationCreateSchema);
  const position = await findPosition(oid(d.positionId));
  if (!position || position.status !== "ACTIVE") throw new ApiError(409, "Applications are closed for this position");
  if (!isOpen(position)) throw new ApiError(409, "The application deadline has passed");

  const profile = await CandidateProfile.findOne({ userId: user._id }).lean();
  const missing = missingForApply(user, profile);
  if (missing.length) throw new ApiError(422, `Complete your profile first: ${missing.join(", ")}`);
  const candidateDocuments = documentsForApplication(profile);
  const have = new Set(candidateDocuments.map((x) => x.documentType));
  const lacking = (position.requiredDocuments ?? []).filter((t: string) => !have.has(t));
  if (lacking.length) throw new ApiError(422, `Upload required documents: ${lacking.map((t: string) => DOCUMENT_LABEL[t] ?? t).join(", ")}`);

  await connectDB();
  if (await Application.exists({ candidateId: user._id, positionId: position._id })) throw new ApiError(409, "You have already applied for this position");

  // Duplicate protection is also enforced by a unique index; a race returns 409 via the error handler.
  const app = await Application.create({
    candidateId: user._id,
    positionId: position._id,
    documents: candidateDocuments,
    answers: d.answers,
    agreement: { version: APPLICATION_AGREEMENT_VERSION, acceptedAt: new Date(), terms: APPLICATION_AGREEMENT_TERMS },
    statusHistory: [{ from: "", to: "NEW", changedBy: user._id, comment: "Application submitted" }],
  });
  // The application is already saved; a notification failure must not turn that into an error response.
  await Promise.all([
    bestEffort("candidate notify", () => notify(user._id, "Application submitted", `Your application for ${position.title} has been received.`, "SUCCESS")),
    bestEffort("admin notify", () => notifyAdmins("New application", `${user.name} applied for ${position.title}.`, "APPLICATION")),
  ]);
  return ok(plain({ id: app._id }), "Application submitted successfully", 201);
});

// Candidate: their own applications only. (Admins use /api/admin/applications.)
export const GET = handle(async () => {
  const user = await requireAuth("CANDIDATE");
  const items = await Application.find({ candidateId: user._id }).sort({ createdAt: -1 }).populate("positionId", "title location").lean();
  return ok({ items: plain(items).map(forCandidate) });
});
