import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Event, EventChangeRequest, EventDocument, EventStaffAssignment, EventTask, Expense, Guest, Invitation, Invoice, ManpowerRequirement, Payment, Quotation, RoomAllocation, ShiftRecord, TransportSchedule } from "@/models";
import { audit } from "@/lib/notify";
import { eventUpdateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";

export const GET = handle(async (_req: NextRequest, { params }) => {
  await requireEventAdmin();
  const id = oid((await params).id);
  const event = await Event.findById(id).populate("clientId").lean();
  if (!event) throw new ApiError(404, "Event not found");
  const [requirements, quotations, agreements, assignments, guests, invitations, rooms, transport, tasks, shifts, expenses, invoices, payments, changes, documents] = await Promise.all([
    ManpowerRequirement.find({ eventId: id }).sort({ eventDate: 1 }).lean(),
    Quotation.find({ eventId: id }).sort({ version: -1 }).lean(),
    Agreement.find({ eventId: id }).sort({ version: -1 }).lean(),
    EventStaffAssignment.find({ eventId: id }).populate("staffId", "employeeId candidateId status position").lean(),
    Guest.countDocuments({ eventId: id }), Invitation.countDocuments({ eventId: id }),
    RoomAllocation.find({ eventId: id }).lean(), TransportSchedule.find({ eventId: id }).lean(), EventTask.find({ eventId: id }).sort({ createdAt: -1 }).lean(),
    ShiftRecord.find({ eventId: id }).sort({ shiftDate: 1 }).lean(), Expense.find({ eventId: id }).sort({ date: -1 }).lean(),
    Invoice.find({ eventId: id }).sort({ createdAt: -1 }).lean(), Payment.find({ eventId: id }).sort({ paymentDate: -1 }).lean(),
    EventChangeRequest.find({ eventId: id }).sort({ requestedAt: -1 }).lean(), EventDocument.find({ eventId: id }).sort({ createdAt: -1 }).lean(),
  ]);
  return ok(plain({ event, requirements, quotations, agreements, assignments, guestsCount: guests, invitationsCount: invitations, rooms, transport, tasks, shifts, expenses, invoices, payments, changes, documents }));
});

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const data = await parseBody(req, eventUpdateSchema);
  const event = await Event.findById(id);
  if (!event) throw new ApiError(404, "Event not found");
  if (event.status === "CLOSED" || event.status === "CANCELLED") throw new ApiError(409, "Cancelled or closed events cannot be edited");
  Object.assign(event, data);
  if (data.eventDate) event.eventDate = new Date(data.eventDate);
  if (data.eventEndDate) event.eventEndDate = new Date(data.eventEndDate);
  if (event.eventEndDate < event.eventDate) throw new ApiError(422, "Event end date cannot be before the start date");
  await event.save();
  await audit(admin._id, "Event updated", "Event", id, Object.keys(data).join(", "));
  return ok(plain(event), "Event updated");
});
