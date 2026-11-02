import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Event, EventStaffAssignment, ManpowerRequirement, Staff, User } from "@/models";
import { assignmentCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
import { shiftRange } from "@/lib/assignment-conflicts";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin(); const eventId = req.nextUrl.searchParams.get("eventId"); if (!eventId) throw new ApiError(422, "eventId is required");
  const items = await EventStaffAssignment.find({ eventId: oid(eventId) }).sort({ eventDate: 1, role: 1 }).populate({ path: "staffId", select: "employeeId position status candidateId", populate: { path: "candidateId", model: User, select: "name phone email" } }).populate("requirementId", "role requiredQuantity").lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin(); const data = await parseBody(req, assignmentCreateSchema);
  const [event, requirement, staff] = await Promise.all([Event.findById(oid(data.eventId)), ManpowerRequirement.findById(oid(data.requirementId)), Staff.findById(oid(data.staffId)).populate("candidateId", "name") as any]);
  if (!event || !requirement || String(requirement.eventId) !== data.eventId) throw new ApiError(404, "Event or event-specific manpower requirement not found");
  if (!staff || staff.status !== "ACTIVE") throw new ApiError(409, "Only an existing active Staff member can be assigned");
  if (String(event._id) !== String(requirement.eventId)) throw new ApiError(409, "Requirement does not belong to this event");
  if (!["CONFIRMED", "STAFF_PLANNING", "STAFF_DEPLOYMENT", "READY_FOR_EVENT"].includes(event.status)) throw new ApiError(409, "Event must be confirmed before staff deployment planning");
  if (requirement.approvalStatus !== "APPROVED") throw new ApiError(409, "Only approved manpower requirements can receive staff assignments");
  const currentCount = await EventStaffAssignment.countDocuments({ requirementId: requirement._id, status: { $in: ["PENDING", "CONFIRMED"] } });
  if (currentCount >= requirement.requiredQuantity) throw new ApiError(409, "This manpower requirement is fully staffed");
  if (await EventStaffAssignment.exists({ requirementId: requirement._id, staffId: staff._id, status: { $in: ["PENDING", "CONFIRMED"] } })) throw new ApiError(409, "This staff member is already assigned to this requirement");
  const target = shiftRange(new Date(requirement.eventDate), requirement.shiftStart, requirement.shiftEnd);
  const rangeStart = new Date(target.from); rangeStart.setUTCHours(0, 0, 0, 0); rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(target.to); rangeEnd.setUTCHours(23, 59, 59, 999);
  const existing = await EventStaffAssignment.find({ staffId: staff._id, status: { $in: ["PENDING", "CONFIRMED"] }, eventDate: { $gte: rangeStart, $lte: rangeEnd } }).lean();
  const conflict = existing.find((item: any) => { const range = shiftRange(new Date(item.eventDate), item.shiftStart, item.shiftEnd); return target.from < range.to && range.from < target.to; });
  if (conflict) throw new ApiError(409, `Staff member has a conflicting assignment (${conflict.role} on ${new Date(conflict.eventDate).toLocaleDateString("en-IN")})`);
  const reserved = await ManpowerRequirement.updateOne({ _id: requirement._id, approvalStatus: "APPROVED", $expr: { $lt: [{ $ifNull: ["$activeAssignmentCount", 0] }, "$requiredQuantity"] } }, { $inc: { activeAssignmentCount: 1 } });
  if (!reserved.modifiedCount) throw new ApiError(409, "This manpower requirement is fully staffed or no longer approved");
  let assignment;
  try { assignment = await EventStaffAssignment.create({ eventId: event._id, staffId: staff._id, requirementId: requirement._id, role: requirement.role, eventDate: requirement.eventDate, shiftStart: requirement.shiftStart, shiftEnd: requirement.shiftEnd, duty: requirement.dutyDescription, reportingLocation: requirement.reportingLocation, instructions: requirement.specialInstructions, notes: data.notes, createdBy: admin._id }); }
  catch (error) { await ManpowerRequirement.updateOne({ _id: requirement._id, activeAssignmentCount: { $gt: 0 } }, { $inc: { activeAssignmentCount: -1 } }); throw error; }
  await audit(admin._id, "Existing staff assigned to event", "EventStaffAssignment", assignment._id, `${staff.employeeId} · ${requirement.role} · ${event.eventName}`);
  const populated = await EventStaffAssignment.findById(assignment._id).populate({ path: "staffId", select: "employeeId position status candidateId", populate: { path: "candidateId", model: User, select: "name phone email" } }).populate("requirementId", "role requiredQuantity").lean();
  return ok(plain(populated), "Staff assignment added as pending confirmation", 201);
});
