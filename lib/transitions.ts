import type { ApplicationStatus } from "./constants";

/** Allowed admin status moves. INTERVIEW_SCHEDULED is only reachable by scheduling an interview. */
export const TRANSITIONS: Record<string, ApplicationStatus[]> = {
  NEW: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["REJECTED"],
  INTERVIEW_SCHEDULED: ["INTERVIEWED", "REJECTED"],
  INTERVIEWED: ["SELECTED", "REJECTED"],
  SELECTED: [],
  REJECTED: [],
};
