import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Event, Quotation } from "@/models";
import { quotationStatusSchema } from "@/lib/event-validators";
import { assertEventTransition, requireEventAdmin, type EventStatus } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const { status, reference } = await parseBody(req, quotationStatusSchema);
  const referenceText = reference ?? "";
  const quote = await Quotation.findById(id);
  if (!quote) throw new ApiError(404, "Quotation not found");
  if (status === "SENT" && quote.status !== "DRAFT") throw new ApiError(409, "Only draft quotations can be sent");
  if (status !== "SENT" && quote.status !== "SENT") throw new ApiError(409, "Only sent quotations can be approved, declined or marked expired");
  if (status === "SENT" && !referenceText.trim()) throw new ApiError(422, "Record how/when the quotation was manually sent");
  if (status === "APPROVED" && !referenceText.trim()) throw new ApiError(422, "Record the client's written approval reference");
  if (["SENT", "APPROVED"].includes(status) && quote.validUntil && quote.validUntil < new Date(new Date().toDateString())) {
    throw new ApiError(409, "This quotation has expired; create a new revision");
  }
  const event = await Event.findById(quote.eventId) as any;
  if (!event) throw new ApiError(404, "Event not found");
  if (status === "SENT" && event.status !== "QUOTATION_PENDING") throw new ApiError(409, "The event must be in Quotation pending before sending this draft");
  if (["APPROVED", "DECLINED"].includes(status) && event.status !== "QUOTATION_SENT") throw new ApiError(409, "The event must be in Quotation sent before recording the client's decision");
  const previousStatus = quote.status;
  quote.status = status;
  if (status === "SENT") { quote.sentAt = new Date(); quote.deliveryReference = referenceText; }
  if (status === "APPROVED") { quote.approvedAt = new Date(); quote.approvedBy = admin._id; quote.approvalReference = referenceText; }
  await quote.save();

  let eventStatus: EventStatus | null = null;
  if (status === "SENT" && event.status === "QUOTATION_PENDING") eventStatus = "QUOTATION_SENT";
  if (status === "APPROVED" && event.status === "QUOTATION_SENT") eventStatus = "QUOTATION_APPROVED";
  if (status === "DECLINED" && event.status === "QUOTATION_SENT") eventStatus = "REQUIREMENTS_PENDING";
  if (eventStatus) {
    assertEventTransition(event.status as EventStatus, eventStatus);
    const result = await Event.updateOne({ _id: event._id, status: event.status }, {
      $set: { status: eventStatus },
      $push: { statusHistory: { from: event.status, to: eventStatus, changedBy: admin._id, reason: `Quotation ${status.toLowerCase()}: ${referenceText}`, at: new Date() } },
    });
    if (!result.modifiedCount) {
      quote.status = previousStatus;
      if (previousStatus === "DRAFT") { quote.sentAt = undefined; quote.deliveryReference = ""; }
      if (previousStatus === "SENT") { quote.approvedAt = undefined; quote.approvedBy = undefined; quote.approvalReference = ""; }
      await quote.save();
      throw new ApiError(409, "Event status changed while the quotation was being updated; reload and try again");
    }
  }
  await audit(admin._id, `Quotation ${status.toLowerCase()}`, "Quotation", id, referenceText || `${quote.quotationNumber} v${quote.version}`);
  return ok(plain(quote), `Quotation ${status.toLowerCase()}`);
});
