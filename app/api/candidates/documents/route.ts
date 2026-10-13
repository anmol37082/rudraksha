import { NextRequest } from "next/server";
import { ApiError, handle, ok, plain, requireAuth, parseBody } from "@/lib/api";
import { deletePrivate, folderFor, uploadPrivate, validateFile } from "@/lib/cloudinary";
import { DOCUMENT_TYPES, SINGLE_DOCUMENT_TYPES } from "@/lib/constants";
import { CandidateProfile } from "@/models";
import { z } from "zod";

export const maxDuration = 30;

export const POST = handle(async (req: NextRequest) => {
  const user = await requireAuth("CANDIDATE");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const type = String(form?.get("documentType") ?? "");
  if (!(file instanceof File)) throw new ApiError(400, "Choose a file to upload");
  const isPhoto = type === "PROFILE_PHOTO";
  if (!isPhoto && !(DOCUMENT_TYPES as readonly string[]).includes(type)) throw new ApiError(422, "Unknown document type");

  const buf = Buffer.from(await file.arrayBuffer());
  const imageOnly = isPhoto || type === "PASSPORT_PHOTO";
  const detected = validateFile(buf, imageOnly);
  const id = String(user._id);
  const resourceType = detected.ext === "pdf" ? "raw" : "image";
  const stamp = Date.now();
  const base = isPhoto ? `${folderFor(id, "profile")}/photo-${stamp}` : `${folderFor(id, "documents")}/${type.toLowerCase()}${SINGLE_DOCUMENT_TYPES.includes(type) ? "" : `-${stamp}`}`;
  // Raw assets keep their extension in the public id. Never use the client-supplied filename in the path.
  const publicId = resourceType === "raw" && !base.endsWith(".pdf") ? `${base}-${stamp}.pdf` : base;

  const up = await uploadPrivate(buf, { publicId, resourceType });
  // If anything below fails after the asset exists in Cloudinary, remove it so failed
  // uploads never leave orphaned storage behind.
  try {
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || `upload.${detected.ext}`;
    const meta = { publicId: up.public_id, resourceType, fileName: safeName, documentType: type, format: detected.ext, bytes: up.bytes, uploadedAt: new Date() } as const;

    const profile = await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true });
    const stale: { publicId: string; resourceType: "image" | "raw" }[] = [];
    if (isPhoto) {
      if (profile.profilePhoto) stale.push(profile.profilePhoto);
      stale.push(...profile.documents.filter((d) => d.documentType === "PASSPORT_PHOTO"));
      profile.profilePhoto = meta;
      profile.documents = profile.documents.filter((d) => d.documentType !== "PASSPORT_PHOTO");
    } else {
      if (SINGLE_DOCUMENT_TYPES.includes(type)) {
        stale.push(...profile.documents.filter((d) => d.documentType === type && d.publicId !== up.public_id));
        profile.documents = profile.documents.filter((d) => d.documentType !== type);
      } else if (profile.documents.filter((d) => d.documentType === type).length >= 5) {
        throw new ApiError(409, "You can upload up to 5 files of this type. Delete one first.");
      }
      profile.documents.push(meta);
    }
    await profile.save();
    // Only after the save succeeds do we retire replaced assets.
    await Promise.all(stale.map((s) => deletePrivate(s.publicId, s.resourceType)));
    return ok(plain({ profilePhoto: profile.profilePhoto, documents: profile.documents }), "File uploaded", 201);
  } catch (e) {
    await deletePrivate(up.public_id, resourceType).catch(() => null);
    throw e;
  }
});

const delSchema = z.object({ publicId: z.string().min(1) });
export const DELETE = handle(async (req: NextRequest) => {
  const user = await requireAuth("CANDIDATE");
  const { publicId } = await parseBody(req, delSchema);
  const profile = await CandidateProfile.findOne({ userId: user._id });
  const doc = profile?.documents.find((d) => d.publicId === publicId);
  if (!profile || !doc) throw new ApiError(404, "File not found");
  profile.documents = profile.documents.filter((d) => d.publicId !== publicId);
  await profile.save();
  await deletePrivate(doc.publicId, doc.resourceType);
  return ok(plain({ documents: profile.documents }), "File deleted");
});
