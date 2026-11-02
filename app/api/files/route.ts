import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle, requireAuth } from "@/lib/api";
import { signedUrl } from "@/lib/cloudinary";
import { assertPrivateFilePathAccess, candidateFileForPublicId, fileFormatAndResourceType, parsePrivateFilePath, receiptFileForPublicId } from "@/lib/private-file-access";
import { CandidateProfile, EventDocument, Expense } from "@/models";

/**
 * Private file gateway: /api/files?publicId=...
 * Only the owning candidate or an admin can receive a short-lived Cloudinary URL
 * for a file that is still recorded on the matching application record.
 */
export const GET = handle(async (req: NextRequest) => {
  const user = await requireAuth();
  const publicId = req.nextUrl.searchParams.get("publicId") ?? "";
  const path = parsePrivateFilePath(publicId);
  if (!path) throw new ApiError(404, "File not found");
  assertPrivateFilePathAccess(path, user.role, String(user._id));

  let file: { publicId: string; format?: string; resourceType?: string } | undefined;
  if (path.kind === "candidate") {
    const profile = await CandidateProfile.findOne({ userId: path.candidateId }).lean();
    file = candidateFileForPublicId(profile, publicId) ?? undefined;
  } else if (path.kind === "receipt") {
    const expense = await Expense.findOne({ _id: path.expenseId, eventId: path.eventId, "receipt.publicId": publicId }).lean() as any;
    file = receiptFileForPublicId(expense, path, publicId) ?? undefined;
  } else {
    const document = await EventDocument.findOne({ _id: path.documentId, eventId: path.eventId, "file.publicId": publicId }).lean() as any;
    file = document?.file?.publicId === publicId ? document.file : undefined;
  }
  if (!file) throw new ApiError(404, "File not found");
  const delivery = fileFormatAndResourceType(file);
  if (!delivery) throw new ApiError(404, "File not found");

  const res = NextResponse.redirect(signedUrl(publicId, delivery.resourceType, delivery.format), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
});
