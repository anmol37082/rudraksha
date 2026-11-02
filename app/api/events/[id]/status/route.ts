import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Event, EventChangeRequest, EventDocument, EventStaffAssignment, EventTask, Expense, Guest, Invoice, Payment, Quotation, ShiftRecord, TransportSchedule } from "@/models";
import { audit } from "@/lib/notify";
import { assertEventTransition, requireEventAdmin, type EventStatus } from "@/lib/event-workflow";
import { eventStatusSchema } from "@/lib/event-validators";

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const { status, reason, overrideReason } = await parseBody(req, eventStatusSchema);
  if (status === "CANCELLED" && !reason?.trim()) throw new ApiError(422, "Add a reason for cancelling the event");
  const event = await Event.findById(id) as any;
  if (!event) throw new ApiError(404, "Event not found");
  if (status === "CONFIRMED") {
    const [quotationDoc, agreement, invoiceDoc] = await Promise.all([
      Quotation.findOne({ eventId: id, status: "APPROVED" }).sort({ version: -1 }).lean(),
      Agreement.findOne({ eventId: id, status: "SIGNED" }).sort({ version: -1 }).lean(),
      Invoice.findOne({ eventId: id }).sort({ createdAt: -1 }).lean(),
    ]);
    const quotation = quotationDoc as any;
    const invoice = invoiceDoc as any;
    const actualReceived = invoice?.amountReceived ?? 0;
    const advanceDue = quotation?.paymentMilestones?.[0]?.amount ?? Math.ceil((quotation?.grandTotal ?? 0) * 0.5);
    assertEventTransition(event.status as EventStatus, status, {
      approvedQuotation: !!quotation,
      signedAgreement: !!agreement,
      requiredAdvanceReceived: !!invoice && actualReceived >= advanceDue,
      overrideReason,
    });
  } else if (status === "CLOSED") {
    if (!reason?.trim()) throw new ApiError(422, "Add a closure summary before closing the event");
    const [assignments, shifts, expenses, invoices, payments, tasks, changes, transport, guests, documents, agreements] = await Promise.all([
      EventStaffAssignment.find({ eventId: id }).lean(), ShiftRecord.find({ eventId: id }).lean(), Expense.find({ eventId: id }).lean(),
      Invoice.find({ eventId: id }).lean(), Payment.find({ eventId: id }).lean(), EventTask.find({ eventId: id }).lean(),
      EventChangeRequest.find({ eventId: id }).lean(), TransportSchedule.find({ eventId: id }).lean(), Guest.countDocuments({ eventId: id }),
      EventDocument.find({ eventId: id }).select("documentType version").lean(), Agreement.find({ eventId: id }).select("version status").lean(),
    ]);
    const invoiceRows = invoices as any[];
    event.closureSnapshot = {
      closedAt: new Date(), closedBy: admin._id, summary: reason!.trim(), guestCount: guests,
      deploymentCount: (assignments as any[]).filter(x => ["CONFIRMED", "COMPLETED"].includes(x.status)).length,
      completedShiftCount: (shifts as any[]).filter(x => x.status === "COMPLETED").length,
      pendingOvertimeCount: (shifts as any[]).filter(x => x.overtimeStatus === "PENDING").length,
      approvedExpenseTotalsByCurrency: Object.fromEntries([...new Set((expenses as any[]).filter(x => x.approvalStatus === "APPROVED").map(x => x.currency))].map(currency => [currency, (expenses as any[]).filter(x => x.approvalStatus === "APPROVED" && x.currency === currency).reduce((n, x) => n + x.amount, 0)])),
      invoiceTotalsByCurrency: Object.fromEntries([...new Set(invoiceRows.map(x => x.currency))].map(currency => [currency, {
        invoiced: invoiceRows.filter(x => x.currency === currency).reduce((n, x) => n + x.grandTotal, 0),
        received: invoiceRows.filter(x => x.currency === currency).reduce((n, x) => n + x.amountReceived, 0),
        outstanding: invoiceRows.filter(x => x.currency === currency).reduce((n, x) => n + Math.max(0, x.grandTotal - x.amountReceived), 0),
      }])),
      pendingTaskCount: (tasks as any[]).filter(x => x.status !== "COMPLETED").length,
      pendingChangeCount: (changes as any[]).filter(x => x.approvalStatus === "PENDING").length,
      transportIssueCount: (transport as any[]).filter(x => x.status === "ISSUE_REPORTED").length,
      finalDocumentCount: (documents as any[]).length + (agreements as any[]).length,
      documentTypes: [...new Set((documents as any[]).map(x => x.documentType))],
      agreementVersions: (agreements as any[]).map(x => ({ version: x.version, status: x.status })),
      invoiceIds: invoiceRows.map(x => x._id), paymentIds: (payments as any[]).map(x => x._id),
    };
  } else {
    assertEventTransition(event.status as EventStatus, status);
  }
  const from = event.status;
  event.status = status;
  event.statusHistory.push({ from, to: status, changedBy: admin._id, reason: reason || overrideReason || "", at: new Date() });
  await event.save();
  await audit(admin._id, "Event status changed", "Event", id, `${from} -> ${status}${overrideReason ? `; override: ${overrideReason}` : reason ? `; ${reason}` : ""}`);
  return ok(plain(event), "Event status updated");
});
