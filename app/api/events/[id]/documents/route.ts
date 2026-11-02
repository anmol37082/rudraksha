import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, plain } from "@/lib/api";
import { deletePrivate, uploadPrivate, validateFile } from "@/lib/cloudinary";
import { requireEventAdmin } from "@/lib/event-workflow";
import { Event, EventDocument } from "@/models";
import { audit } from "@/lib/notify";

export const GET = handle(async (_req: NextRequest, { params }) => {
  await requireEventAdmin();
  const eventId = oid((await params).id);
  if (!await Event.exists({ _id: eventId })) throw new ApiError(404, "Event not found");
  const documents = await EventDocument.find({ eventId }).select("eventId documentType version file.publicId file.resourceType file.originalName file.format file.bytes uploadedBy createdAt").sort({ createdAt: -1 }).lean();
  return ok({ items: plain(documents) });
});

export const POST = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const eventId = oid((await params).id);
  const event = await Event.findById(eventId).select("status").lean() as any;
  if (!event) throw new ApiError(404, "Event not found");
  if (["CANCELLED", "CLOSED"].includes(event.status)) throw new ApiError(409, "Cannot add documents to a cancelled or closed event");
  const form = await req.formData();
  const file = form.get("file");
  const documentType = String(form.get("documentType") ?? "").trim();
  if (!(file instanceof File)) throw new ApiError(422, "Select a document file");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _().-]{1,79}$/u.test(documentType)) throw new ApiError(422, "Enter a valid document type");
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = validateFile(bytes, false);
  const resourceType = detected.ext === "pdf" ? "raw" : "image";
  const documentId = new mongoose.Types.ObjectId();
  const publicId = `wedding-staff/events/${eventId}/documents/${documentId}-${randomUUID()}`;
  const uploaded = await uploadPrivate(bytes, { publicId, resourceType });
  const version = (await EventDocument.findOne({ eventId, documentType }).sort({ version: -1 }).select("version").lean() as any)?.version ?? 0;
  let document;
  try {
    document = await EventDocument.create({ _id: documentId, eventId, documentType, version: version + 1, file: { publicId: uploaded.public_id, resourceType, format: detected.ext, bytes: uploaded.bytes, originalName: file.name.slice(0, 180), uploadedAt: new Date() }, uploadedBy: admin._id });
  } catch (error) {
    await deletePrivate(uploaded.public_id, resourceType);
    throw error;
  }
  await audit(admin._id, "Event document uploaded", "EventDocument", document._id, `${documentType} v${document.version}`);
  return ok(plain(document), "Private event document uploaded", 201);
});
