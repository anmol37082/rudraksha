import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Event, Guest, RoomAllocation } from "@/models";
import { roomAllocationSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin(); const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) throw new ApiError(422, "eventId is required");
  const items = await RoomAllocation.find({ eventId: oid(eventId) }).sort({ checkInDate: 1, hotelName: 1 }).populate("guestId", "name contactNumber").populate("sharingWith", "name").lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin(); const data = await parseBody(req, roomAllocationSchema);
  const sharingWith = data.sharingWith ?? [];
  const [event, guest, shareGuests] = await Promise.all([
    Event.findById(oid(data.eventId)), Guest.findById(oid(data.guestId)),
    sharingWith.length ? Guest.find({ _id: { $in: sharingWith }, eventId: oid(data.eventId) }).select("_id").lean() : Promise.resolve([]),
  ]);
  if (!event || !guest || String(event._id) !== String(guest.eventId) || String(event._id) !== data.eventId) throw new ApiError(404, "Event guest not found");
  if (shareGuests.length !== sharingWith.length) throw new ApiError(422, "Every room-sharing guest must belong to this event");
  if (sharingWith.includes(data.guestId)) throw new ApiError(422, "A guest cannot be listed as sharing a room with themselves");
  const checkIn = new Date(data.checkInDate); const checkOut = new Date(data.checkOutDate);
  const overlap = { eventId: event._id, status: { $ne: "CANCELLED" }, checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } };
  if (await RoomAllocation.exists({ ...overlap, guestId: guest._id })) throw new ApiError(409, "This guest already has an overlapping room allocation");
  if (data.roomNumber) {
    const conflicts = await RoomAllocation.find({ ...overlap, hotelName: data.hotelName, roomNumber: data.roomNumber }).lean() as any[];
    const allowed = conflicts.every((room) => sharingWith.includes(String(room.guestId)) && (room.sharingWith ?? []).map(String).includes(data.guestId));
    if (!allowed) throw new ApiError(409, "This room is already occupied for overlapping dates; record mutual room sharing if applicable");
  }
  const item = await RoomAllocation.create({ ...data, eventId: event._id, guestId: guest._id, sharingWith: sharingWith.map(oid), checkInDate: checkIn, checkOutDate: checkOut, status: "ASSIGNED", createdBy: admin._id });
  await audit(admin._id, "Guest room allocated", "RoomAllocation", item._id, `${guest.name} · ${data.hotelName} ${data.roomNumber}`);
  return ok(plain(item), "Room allocation recorded", 201);
});
