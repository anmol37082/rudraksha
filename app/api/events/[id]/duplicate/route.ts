import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Client, Event } from "@/models";
import { eventCreateSchema } from "@/lib/event-validators";
import { audit } from "@/lib/notify";
import { requireEventAdmin } from "@/lib/event-workflow";

export const POST = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const sourceId = oid((await params).id);
  const source = await Event.findById(sourceId).lean() as any;
  if (!source) throw new ApiError(404, "Event not found");
  const override = await parseBody(req, eventCreateSchema);
  if (String(override.clientId) !== String(source.clientId)) throw new ApiError(422, "A duplicate event must remain under the same client");
  const client = await Client.findById(override.clientId).select("status");
  if (!client || client.status === "ARCHIVED") throw new ApiError(404, "Active client not found");
  const { _id: _sourceId, createdAt: _createdAt, updatedAt: _updatedAt, __v: _version, ...sourceFields } = source as any;
  const copy = await Event.create({
    ...sourceFields,
    ...override,
    _id: undefined,
    eventDate: new Date(override.eventDate),
    eventEndDate: new Date(override.eventEndDate),
    eventName: override.eventName,
    status: "DRAFT",
    statusHistory: [{ from: "", to: "DRAFT", changedBy: admin._id, reason: `Copied from ${source._id}`, at: new Date() }],
    closureSnapshot: undefined,
    createdBy: admin._id,
  });
  await audit(admin._id, "Event duplicated", "Event", copy._id, `Copied from ${source._id}`);
  return ok(plain(copy), "Draft event created from existing event", 201);
});
