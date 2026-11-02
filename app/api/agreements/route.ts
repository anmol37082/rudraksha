import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Client, Event, Quotation } from "@/models";
import { agreementCreateSchema } from "@/lib/event-validators";
import { assertEventTransition, requireEventAdmin, type EventStatus } from "@/lib/event-workflow";
import { renderAgreementSections } from "@/lib/agreement-template";
import { audit } from "@/lib/notify";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin(); const eventId = req.nextUrl.searchParams.get("eventId");
  const filter: Record<string, unknown> = {}; if (eventId) filter.eventId = oid(eventId);
  const items = await Agreement.find(filter).sort({ createdAt: -1 }).populate("eventId", "eventName eventDate").populate("quotationId", "quotationNumber version").lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin(); const data = await parseBody(req, agreementCreateSchema);
  const [event, quote] = await Promise.all([Event.findById(oid(data.eventId)).populate("clientId").lean() as any, Quotation.findById(oid(data.quotationId)).lean() as any]);
  if (!event) throw new ApiError(404, "Event not found");
  if (!quote || String(quote.eventId) !== String(event._id) || quote.status !== "APPROVED") throw new ApiError(409, "Select an approved quotation belonging to this event");
  if (!quote.rsvpIncluded && data.cancellationTermsInitialed && (!(data.cancellationTerms ?? "").trim() || !(data.clientCancellationInitial ?? "").trim() || !(data.providerCancellationInitial ?? "").trim())) throw new ApiError(422, "For a non-RSVP agreement, enter alternative cancellation terms and record initials from both parties");
  if (["CANCELLED", "CLOSED", "COMPLETED"].includes(event.status)) throw new ApiError(409, "Cannot create an agreement for a completed, cancelled or closed event");
  const previous = await Agreement.findOne({ eventId: event._id }).sort({ version: -1 }).lean() as any;
  if (previous?.status === "SIGNED") throw new ApiError(409, "A signed agreement cannot be revised here; create an approved event change first");
  const client = event.clientId; const milestoneText = quote.paymentMilestones.map((m: any) => `${m.name}: ${m.percentage}% (${quote.currency} ${m.amount}) — ${m.dueDescription}`).join("; ");
  const snapshot: Record<string, unknown> = {
    agreementDate: new Date(data.agreementDate).toLocaleDateString("en-IN"), providerAddress: data.providerAddress, providerRepresentative: data.providerRepresentative,
    clientName: client?.name ?? "", clientAddress: data.clientAddress || [client?.businessAddress, client?.city, client?.state, client?.country].filter(Boolean).join(", "),
    clientRepresentative: data.clientRepresentative || client?.authorizedRepresentative || client?.contactPerson || "",
    hostName: event.coupleOrHostName || event.eventName, eventName: event.eventName,
    venues: event.venues.map((v: any) => [v.name, v.address, v.city, v.state].filter(Boolean).join(", ")).join("; "),
    eventDates: `${new Date(event.eventDate).toLocaleDateString("en-IN")} – ${new Date(event.eventEndDate).toLocaleDateString("en-IN")}`,
    city: event.venues.map((v: any) => v.city).filter(Boolean).join(", "), guestCount: event.estimatedGuestCount, eventDays: event.numberOfEventDays,
    selectedServices: quote.snapshot.services.map((s: any) => `${s.name} × ${s.quantity}`).join("; ") || "As described in the approved quotation",
    paymentMilestones: milestoneText, bankDetails: data.bankDetails, taxDetails: data.taxDetails,
    cancellationTerms: data.cancellationTerms, cancellationTermsInitialed: data.cancellationTermsInitialed,
    clientCancellationInitial: data.clientCancellationInitial, providerCancellationInitial: data.providerCancellationInitial,
    rsvpIncluded: quote.rsvpIncluded,
    quotationNumber: quote.quotationNumber, quotationVersion: quote.version, quotationTotal: quote.grandTotal, quotationCurrency: quote.currency,
  };
  const sections = renderAgreementSections(snapshot);
  const cancellationInitials = data.cancellationTermsInitialed ? [{ party: "CLIENT", acceptedBy: client?.contactPerson || client?.name || "", method: "Initialed cancellation terms", reference: data.clientCancellationInitial, acceptedAt: new Date() }, { party: "PROVIDER", acceptedBy: data.providerRepresentative, method: "Initialed cancellation terms", reference: data.providerCancellationInitial, acceptedAt: new Date() }] : [];
  const agreement = await Agreement.create({ eventId: event._id, quotationId: quote._id, version: (previous?.version ?? 0) + 1, status: "DRAFT", sections, snapshot, cancellationTerms: data.cancellationTerms, cancellationTermsInitialed: data.cancellationTermsInitialed, cancellationInitials, createdBy: admin._id });
  if (previous) await Agreement.updateOne({ _id: previous._id, status: { $ne: "SIGNED" } }, { $set: { status: "SUPERSEDED" } });
  if (event.status === "QUOTATION_APPROVED") {
    assertEventTransition(event.status as EventStatus, "AGREEMENT_PENDING");
    const changed = await Event.updateOne({ _id: event._id, status: "QUOTATION_APPROVED" }, { $set: { status: "AGREEMENT_PENDING" }, $push: { statusHistory: { from: "QUOTATION_APPROVED", to: "AGREEMENT_PENDING", changedBy: admin._id, reason: "Agreement draft created", at: new Date() } } });
    if (!changed.modifiedCount) { await Agreement.deleteOne({ _id: agreement._id }); if (previous) await Agreement.updateOne({ _id: previous._id, status: "SUPERSEDED" }, { $set: { status: previous.status } }); throw new ApiError(409, "Event status changed while agreement was being created"); }
  }
  await audit(admin._id, "Agreement draft created", "Agreement", agreement._id, `v${agreement.version}; quotation ${quote.quotationNumber}`);
  return ok(plain(agreement), "Agreement draft created", 201);
});
