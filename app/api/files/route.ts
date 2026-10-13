import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle, requireAuth } from "@/lib/api";
import { signedUrl } from "@/lib/cloudinary";

const PATH = /^wedding-staff\/candidates\/([a-f0-9]{24})\/(profile|documents)\/[\w\-./]+$/;

/**
 * Private file gateway: /api/files?publicId=...&type=image|raw
 * Only the owning candidate or an admin gets redirected to a signed Cloudinary URL.
 */
export const GET = handle(async (req: NextRequest) => {
  const user = await requireAuth();
  const publicId = req.nextUrl.searchParams.get("publicId") ?? "";
  const type = req.nextUrl.searchParams.get("type") === "raw" ? "raw" : "image";
  const m = PATH.exec(publicId);
  if (!m || publicId.includes("..")) throw new ApiError(404, "File not found");
  if (user.role !== "ADMIN" && String(user._id) !== m[1]) throw new ApiError(403, "You do not have access to this file");
  const res = NextResponse.redirect(signedUrl(publicId, type), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
});
