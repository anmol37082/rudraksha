import { NextRequest } from "next/server";
import { ApiError, escapeRegex, handle, ok, oid, pageParams, parseBody, plain } from "@/lib/api";
import { Client, Event } from "@/models";
import { audit } from "@/lib/notify";
import { eventCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams, 20);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const filter: Record<string, unknown> = {};
  if (clientId) filter.clientId = oid(clientId);
  if (status) filter.status = status;
  if (q) filter.eventName = new RegExp(escapeRegex(q), "i");
  const [items, total] = await Promise.all([
    Event.find(filter).sort({ eventDate: -1 }).skip(skip).limit(limit).populate("clientId", "name businessName contactPerson email phone").lean(),
    Event.countDocuments(filter),
  ]);
  return ok({ items: plain(items), total, page, limit });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, eventCreateSchema);
  const client = await Client.findById(data.clientId).select("status");
  if (!client || client.status === "ARCHIVED") throw new ApiError(404, "Active client not found");
  const event = await Event.create({ ...data, eventDate: new Date(data.eventDate), eventEndDate: new Date(data.eventEndDate), status: "DRAFT", statusHistory: [{ from: "", to: "DRAFT", changedBy: admin._id, reason: "Event created", at: new Date() }], createdBy: admin._id });
  await audit(admin._id, "Event created", "Event", event._id, event.eventName);
  return ok(plain(event), "Event created", 201);
});
