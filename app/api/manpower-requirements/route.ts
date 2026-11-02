import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Event, ManpowerRequirement, Service } from "@/models";
import { manpowerRequirementSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) throw new ApiError(422, "eventId is required");
  const items = await ManpowerRequirement.find({ eventId: oid(eventId) }).sort({ eventDate: 1, role: 1 }).populate("serviceId", "name category").lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, manpowerRequirementSchema);
  const event = await Event.findById(oid(data.eventId));
  if (!event) throw new ApiError(404, "Event not found");
  if (["CANCELLED", "CLOSED", "COMPLETED"].includes(event.status)) throw new ApiError(409, "Requirements cannot be added to a completed, cancelled or closed event");
  if (data.serviceId) {
    const service = await Service.findById(oid(data.serviceId)).select("isActive isRegulated");
    if (!service || !service.isActive) throw new ApiError(404, "Active service not found");
  }
  const requirement = await ManpowerRequirement.create({ ...data, eventId: event._id, eventDate: new Date(data.eventDate), approvalStatus: "PENDING", createdBy: admin._id });
  await audit(admin._id, "Manpower requirement created", "ManpowerRequirement", requirement._id, `${requirement.role} × ${requirement.requiredQuantity}`);
  return ok(plain(requirement), "Manpower requirement created for approval", 201);
});
