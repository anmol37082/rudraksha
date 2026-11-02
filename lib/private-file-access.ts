import { ApiError } from "./api";

export type PrivateFilePath =
  | { kind: "candidate"; candidateId: string }
  | { kind: "receipt"; eventId: string; expenseId: string }
  | { kind: "event-document"; eventId: string; documentId: string };

const CANDIDATE_PATH = /^wedding-staff\/candidates\/([a-f0-9]{24})\/(?:profile|documents)\/[\w-]+(?:\.[A-Za-z0-9]+)?$/;
const RECEIPT_PATH = /^wedding-staff\/events\/([a-f0-9]{24})\/expenses\/([a-f0-9]{24})-[a-f0-9-]+$/;
const EVENT_DOCUMENT_PATH = /^wedding-staff\/events\/([a-f0-9]{24})\/documents\/([a-f0-9]{24})-[a-f0-9-]+$/;

export function parsePrivateFilePath(publicId: string): PrivateFilePath | null {
  if (!publicId || publicId.includes("..") || publicId.includes("\\")) return null;
  const candidate = CANDIDATE_PATH.exec(publicId);
  if (candidate) return { kind: "candidate", candidateId: candidate[1] };
  const receipt = RECEIPT_PATH.exec(publicId);
  if (receipt) return { kind: "receipt", eventId: receipt[1], expenseId: receipt[2] };
  const document = EVENT_DOCUMENT_PATH.exec(publicId);
  if (document) return { kind: "event-document", eventId: document[1], documentId: document[2] };
  return null;
}

export function assertPrivateFilePathAccess(path: PrivateFilePath, role: string, userId: string): void {
  if (path.kind === "receipt" || path.kind === "event-document") {
    if (role !== "ADMIN") throw new ApiError(403, "Only an administrator can access event expense receipts");
    return;
  }
  if (role !== "ADMIN" && userId !== path.candidateId) {
    throw new ApiError(403, "You do not have access to this file");
  }
}

export function fileFormatAndResourceType(file: { format?: string; resourceType?: string }): { format: string; resourceType: "image" | "raw" } | null {
  const format = file.format?.toLowerCase();
  if (!format || !["jpg", "png", "webp", "pdf"].includes(format)) return null;
  const resourceType = format === "pdf" ? "raw" : "image";
  if (file.resourceType !== resourceType) return null;
  return { format, resourceType };
}

export function candidateFileForPublicId(profile: { profilePhoto?: any; documents?: any[] } | null | undefined, publicId: string) {
  return [profile?.profilePhoto, ...(profile?.documents ?? [])].find((file) => file?.publicId === publicId) ?? null;
}

export function receiptFileForPublicId(expense: { eventId?: unknown; _id?: unknown; receipt?: any } | null | undefined, path: Extract<PrivateFilePath, { kind: "receipt" }>, publicId: string) {
  if (!expense || String(expense.eventId) !== path.eventId || String(expense._id) !== path.expenseId) return null;
  return expense.receipt?.publicId === publicId ? expense.receipt : null;
}
