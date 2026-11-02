import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid } from "@/lib/api";
import { deletePrivate } from "@/lib/cloudinary";
import { requireEventAdmin } from "@/lib/event-workflow";
import { Event, EventDocument } from "@/models";
import { audit } from "@/lib/notify";

export const DELETE = handle(async (_req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const { id, documentId } = await params;
  const eventId = oid(id);
  const document = await EventDocument.findOne({ _id: oid(documentId), eventId });
  if (!document) throw new ApiError(404, "Event document not found");
  const event = await Event.findById(eventId).select("status").lean() as any;
  if (!event) throw new ApiError(404, "Event not found");
  if (event.status === "CLOSED") throw new ApiError(409, "Documents cannot be removed after event closure");
  const file = document.file as any;
  const deleted = await deletePrivate(file.publicId, file.resourceType === "raw" ? "raw" : "image");
  if (!deleted || (deleted as any).result === "error") throw new ApiError(502, "Private document storage could not remove this file");
  await document.deleteOne();
  await audit(admin._id, "Event document removed", "EventDocument", document._id, `${document.documentType} v${document.version}`);
  return ok({ id: documentId }, "Event document removed");
});
