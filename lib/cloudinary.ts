import { v2 as cloudinary } from "cloudinary";
import { MAX_DOC_BYTES, MAX_PHOTO_BYTES } from "./constants";
import { ApiError } from "./api";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const folderFor = (candidateId: string, kind: "profile" | "documents") => `wedding-staff/candidates/${candidateId}/${kind}`;

type Detected = { ext: "jpg" | "png" | "webp" | "pdf"; mime: string };

/** Detect the real type from file bytes. We never trust the client filename or MIME. */
export function sniff(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.subarray(0, 5).toString() === "%PDF-") return { ext: "pdf", mime: "application/pdf" };
  return null;
}

export function validateFile(buf: Buffer, isPhoto: boolean) {
  const max = isPhoto ? MAX_PHOTO_BYTES : MAX_DOC_BYTES;
  if (buf.length === 0) throw new ApiError(400, "The file is empty");
  if (buf.length > max) throw new ApiError(422, `File is too large (max ${max / 1024 / 1024} MB)`);
  const t = sniff(buf);
  if (!t || (isPhoto && t.ext === "pdf")) throw new ApiError(422, isPhoto ? "Photo must be a JPG, PNG or WEBP image" : "File must be a PDF, JPG, PNG or WEBP");
  return t;
}

/** Upload as an *authenticated* asset: not reachable without a signed URL. */
export function uploadPrivate(buf: Buffer, opts: { publicId: string; resourceType: "image" | "raw" }) {
  return new Promise<{ public_id: string; bytes: number; format?: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { public_id: opts.publicId, resource_type: opts.resourceType, type: "authenticated", overwrite: true, invalidate: true },
        (err, res) => (err || !res ? reject(err ?? new Error("Cloudinary upload failed")) : resolve(res))
      )
      .end(buf);
  });
}

export function deletePrivate(publicId: string, resourceType: "image" | "raw") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: "authenticated", invalidate: true }).catch(() => null);
}

export function signedUrl(publicId: string, resourceType: "image" | "raw") {
  return cloudinary.url(publicId, { resource_type: resourceType, type: "authenticated", sign_url: true, secure: true });
}
