// Client-safe constants (no server imports).
export const APPLICATION_STATUSES = ["NEW", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type PositionStatus = (typeof POSITION_STATUSES)[number];
export type InterviewType = (typeof INTERVIEW_TYPES)[number];
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Submitted",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEWED: "Interviewed",
  SELECTED: "Selected",
  REJECTED: "Not selected",
  ACTIVE: "Active",
  PAUSED: "Paused",
  CLOSED: "Closed",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
  TERMINATED: "Terminated",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

export const STATUS_TONE: Record<string, string> = {
  NEW: "status-badge bg-[#eaf1f8] text-[#3268a8]",
  UNDER_REVIEW: "status-badge bg-[#fbf0df] text-[#8a5410]",
  SHORTLISTED: "status-badge bg-[#e9f3ed] text-[#23764b]",
  INTERVIEW_SCHEDULED: "status-badge bg-[#eaf1f8] text-[#3268a8]",
  INTERVIEWED: "status-badge bg-[#e9f3ed] text-[#23764b]",
  SELECTED: "status-badge bg-[#e9f3ed] text-[#23764b]",
  REJECTED: "status-badge bg-[#fae9ea] text-[#b42332]",
  ACTIVE: "status-badge bg-[#e9f3ed] text-[#23764b]",
  PAUSED: "status-badge bg-[#fbf0df] text-[#8a5410]",
  CLOSED: "status-badge bg-[#eef0ed] text-[#737b74]",
  INACTIVE: "status-badge bg-[#eef0ed] text-[#737b74]",
  ON_LEAVE: "status-badge bg-[#fbf0df] text-[#8a5410]",
  TERMINATED: "status-badge bg-[#fae9ea] text-[#b42332]",
  SCHEDULED: "status-badge bg-[#eaf1f8] text-[#3268a8]",
  COMPLETED: "status-badge bg-[#e9f3ed] text-[#23764b]",
  CANCELLED: "status-badge bg-[#eef0ed] text-[#737b74]",
  RESCHEDULED: "status-badge bg-[#fbf0df] text-[#8a5410]",
};

export const POSITION_STATUSES = ["ACTIVE", "PAUSED", "CLOSED"] as const;
export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;
export const EMPLOYMENT_LABEL: Record<string, string> = { FULL_TIME: "Full time", PART_TIME: "Part time", CONTRACT: "Contract" };
export const INTERVIEW_TYPES = ["IN_PERSON", "PHONE", "VIDEO"] as const;
export const INTERVIEW_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"] as const;
export const STAFF_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export const DOCUMENT_TYPES = ["PASSPORT_PHOTO", "SIGNATURE", "RESUME", "ID_PROOF", "ADDRESS_PROOF", "CERTIFICATE", "OTHER"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const MANDATORY_POSITION_DOCUMENTS: DocumentType[] = ["PASSPORT_PHOTO", "SIGNATURE"];
export const DOCUMENT_LABEL: Record<string, string> = {
  PROFILE_PHOTO: "Profile photo",
  PASSPORT_PHOTO: "Passport-size photo",
  SIGNATURE: "Signature",
  RESUME: "Resume / CV",
  ID_PROOF: "Identity proof",
  ADDRESS_PROOF: "Address proof",
  CERTIFICATE: "Certificate",
  OTHER: "Other document",
};
// Types where a new upload replaces the previous one.
export const SINGLE_DOCUMENT_TYPES: string[] = ["PASSPORT_PHOTO", "SIGNATURE", "RESUME", "ID_PROOF", "ADDRESS_PROOF"];

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
