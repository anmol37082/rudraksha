import { ApiError } from "./api";
import { audit, notify } from "./notify";
import { Application, Interview } from "@/models";
import type { ApplicationStatus } from "./constants";
import { TRANSITIONS } from "./transitions";

const MESSAGES: Partial<Record<ApplicationStatus, [string, string, string]>> = {
  UNDER_REVIEW: ["Application under review", "Our team has started reviewing your application for", "INFO"],
  SHORTLISTED: ["You have been shortlisted", "Good news! You have been shortlisted for", "SUCCESS"],
  SELECTED: ["You have been selected", "Congratulations! You have been selected for", "SUCCESS"],
  REJECTED: ["Application update", "Thank you for applying. Unfortunately we will not be moving forward with your application for", "INFO"],
};

const AUDIT: Partial<Record<ApplicationStatus, string>> = {
  SHORTLISTED: "Candidate shortlisted",
  REJECTED: "Candidate rejected",
  SELECTED: "Candidate selected",
  INTERVIEW_SCHEDULED: "Interview scheduled",
};

type AppDoc = InstanceType<typeof Application>;

export async function changeStatus(app: AppDoc, to: ApplicationStatus, adminId: unknown, positionTitle: string, comment = "", opts: { skipCheck?: boolean } = {}) {
  const from = app.status as ApplicationStatus;
  if (!opts.skipCheck && !TRANSITIONS[from]?.includes(to)) {
    throw new ApiError(409, `Cannot change status from ${from} to ${to}`);
  }
  app.status = to;
  app.statusHistory.push({ from, to, changedBy: adminId as never, comment, at: new Date() });
  await app.save();

  if (to === "INTERVIEWED") await Interview.updateMany({ applicationId: app._id, status: "SCHEDULED" }, { status: "COMPLETED" });
  const m = MESSAGES[to];
  if (m) await notify(app.candidateId, m[0], `${m[1]} ${positionTitle}.`, m[2]);
  const a = AUDIT[to];
  if (a) await audit(adminId, a, "Application", app._id, positionTitle);
}

/** Strips admin-only data before an application is sent to a candidate. */
export function forCandidate<T extends Record<string, any>>(app: T) {
  const { adminNotes, statusHistory, ...rest } = app as any;
  return { ...rest, statusHistory: (statusHistory ?? []).map((h: any) => ({ to: h.to, at: h.at })) };
}
