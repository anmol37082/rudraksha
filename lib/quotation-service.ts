import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api";
import { Event, Agreement, Expense, ManpowerRequirement, Quotation, RateCard, Service } from "@/models";
import { assertEventTransition, type EventStatus } from "@/lib/event-workflow";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const isRsvpService = (service: { name?: string; category?: string }) => /rsvp|invitation/i.test(`${service.name ?? ""} ${service.category ?? ""}`);
export const calculateManpowerAmount = (quantity: number, rate: number, pricingUnit: string) => round2(rate * (pricingUnit === "PER_EVENT" ? 1 : quantity));

export async function createQuotation(adminId: unknown, data: any, previousId?: string) {
  const event = await Event.findById(data.eventId).populate("clientId").lean() as any;
  if (!event) throw new ApiError(404, "Event not found");
  if (["CANCELLED", "COMPLETED", "CLOSED"].includes(event.status)) throw new ApiError(409, "A quotation cannot be created for a completed, cancelled or closed event");

  const previous = await Quotation.findById(previousId).lean() as any;
  const latest = await Quotation.findOne({ eventId: event._id }).sort({ version: -1 }).lean() as any;
  if (!previousId && latest) throw new ApiError(409, "This event already has a quotation. Create a new revision from the latest version.");
  if (previousId) {
    if (!previous || String(previous.eventId) !== String(event._id)) throw new ApiError(404, "Quotation revision source not found for this event");
    if (!latest || String(latest._id) !== String(previous._id)) throw new ApiError(409, "Create a revision from the latest quotation version");
    if (!data.revisionReason?.trim()) throw new ApiError(422, "Describe why this quotation is being revised");
    const signedAgreement = await Agreement.exists({ eventId: event._id, status: "SIGNED" });
    if (signedAgreement) throw new ApiError(409, "A signed agreement exists. Record an event change and new agreement before revising commercial terms.");
  }
  if (!["QUOTATION_PENDING", "QUOTATION_SENT", "QUOTATION_APPROVED"].includes(event.status)) {
    throw new ApiError(409, "Move the event to Quotation pending before creating a quotation");
  }

  const selectedServices = data.services.length ? await Service.find({ _id: { $in: data.services.map((s: any) => s.serviceId) } }).lean() as any[] : [];
  if (selectedServices.length !== data.services.length) throw new ApiError(404, "One or more selected services were not found");
  const selectedById = new Map(selectedServices.map((service) => [String(service._id), service]));
  const inactive = selectedServices.find((service) => !service.isActive);
  if (inactive) throw new ApiError(409, `Service ${inactive.name} is inactive`);
  const containsRsvp = selectedServices.some(isRsvpService);
  if (containsRsvp !== data.rsvpIncluded) throw new ApiError(422, "RSVP payment terms must match whether an invitation/RSVP service is selected");

  const serviceSnapshots = data.services.map((line: any) => {
    const service = selectedById.get(String(line.serviceId));
    const amount = round2(line.quantity * line.unitRate);
    return {
      serviceId: service._id,
      name: service.name,
      description: service.description,
      quantity: line.quantity,
      unit: line.unit,
      unitRate: line.unitRate,
      amount,
      approved: true,
    };
  });
  const quoteLines: any[] = serviceSnapshots.map((line: any) => ({
    kind: "SERVICE", sourceId: line.serviceId, description: line.name, quantity: line.quantity,
    unit: line.unit, unitRate: line.unitRate, amount: line.amount,
  }));

  const requirements = data.manpowerRequirementIds.length
    ? await ManpowerRequirement.find({ _id: { $in: data.manpowerRequirementIds }, eventId: event._id }).lean() as any[]
    : [];
  if (requirements.length !== data.manpowerRequirementIds.length) throw new ApiError(404, "One or more manpower requirements do not belong to this event");
  const unapproved = requirements.find((requirement) => requirement.approvalStatus !== "APPROVED");
  if (unapproved) throw new ApiError(409, `Approve the ${unapproved.role} manpower requirement before adding it to a quotation`);
  const regulated = selectedServices.find((service) => service.isRegulated);
  if (regulated) {
    const verified = requirements.some((requirement) => String(requirement.serviceId) === String(regulated._id) && [requirement.licenceReference, requirement.venuePermissionReference, requirement.writtenConfirmationReference].every((value: string) => value?.trim()));
    if (!verified) throw new ApiError(409, `${regulated.name} requires an approved manpower requirement with licence, venue permission and written confirmation references`);
  }
  const regulatedRoles = requirements.find((requirement) => /security|ps[o0]|bouncer|guard|gunman|medical|regulated/i.test(requirement.role) && ![requirement.licenceReference, requirement.venuePermissionReference, requirement.writtenConfirmationReference].every((value: string) => value?.trim()));
  if (regulatedRoles) throw new ApiError(409, `${regulatedRoles.role} requires licence, venue permission and written confirmation references`);

  for (const requirement of requirements) {
    const roleKey = String(requirement.role).trim().toLowerCase();
    const rate = await RateCard.findOne({
      roleKey,
      isActive: true,
      effectiveFrom: { $lte: new Date(requirement.eventDate) },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date(requirement.eventDate) } }],
    }).sort({ effectiveFrom: -1, version: -1 }).lean() as any;
    if (!rate) throw new ApiError(422, `No rate card is effective for ${requirement.role} on ${new Date(requirement.eventDate).toLocaleDateString("en-IN")}`);
    if (rate.currency !== data.currency.toUpperCase()) throw new ApiError(422, `The ${requirement.role} rate card uses ${rate.currency}; quote currency must match`);
    const amount = calculateManpowerAmount(requirement.requiredQuantity, rate.rate, rate.pricingUnit);
    quoteLines.push({
      kind: "MANPOWER", sourceId: requirement._id,
      description: `${requirement.role} · ${new Date(requirement.eventDate).toLocaleDateString("en-IN")} · ${requirement.shiftStart}–${requirement.shiftEnd}`,
      quantity: requirement.requiredQuantity, unit: rate.pricingUnit, unitRate: rate.rate, amount,
      rateCardVersion: rate.version, standardShiftHours: requirement.standardShiftHours, overtimeRules: rate.overtimeRules,
    });
  }

  const expenses = data.expenseIds.length
    ? await Expense.find({ _id: { $in: data.expenseIds }, eventId: event._id, approvalStatus: "APPROVED" }).lean() as any[]
    : [];
  if (expenses.length !== data.expenseIds.length) throw new ApiError(409, "Only approved expenses linked to this event may be included");
  for (const expense of expenses) {
    if (expense.currency !== data.currency.toUpperCase()) throw new ApiError(422, `Expense ${expense.description} uses ${expense.currency}; quote currency must match`);
    quoteLines.push({ kind: "EXPENSE", sourceId: expense._id, description: `${expense.category}: ${expense.description}`, quantity: 1, unit: "approved expense", unitRate: expense.amount, amount: expense.amount });
  }
  for (const line of data.additionalLines) {
    const amount = round2(line.quantity * line.unitRate);
    quoteLines.push({ ...line, amount });
  }
  const subtotal = round2(quoteLines.reduce((sum, line) => sum + line.amount, 0));
  const taxAmount = round2(subtotal * data.taxRate / 100);
  const beforeDiscount = round2(subtotal + taxAmount);
  if (data.discount > beforeDiscount) throw new ApiError(422, "Discount cannot exceed the quotation subtotal and tax");
  const grandTotal = round2(beforeDiscount - data.discount);
  const milestoneInputs = data.rsvpIncluded
    ? [
      { name: "Agreement signing advance", percentage: 50, dueDescription: "Upon signing the agreement" },
      { name: "Invitation and RSVP commencement", percentage: 30, dueDescription: "When invitation/RSVP management services commence" },
      { name: "Final pre-event payment", percentage: 20, dueDescription: "At least one week before the event" },
    ]
    : data.alternativeMilestones;
  let assigned = 0;
  const paymentMilestones = milestoneInputs.map((milestone: any, index: number) => {
    const amount = index === milestoneInputs.length - 1 ? round2(grandTotal - assigned) : round2(grandTotal * milestone.percentage / 100);
    assigned = round2(assigned + amount);
    return { ...milestone, amount, dueAt: milestone.dueAt ? new Date(milestone.dueAt) : undefined };
  });

  if (event.status !== "QUOTATION_PENDING") assertEventTransition(event.status as EventStatus, "QUOTATION_PENDING");

  const client = event.clientId;
  const eventSnapshot = {
    eventName: event.eventName, eventType: event.eventType, coupleOrHostName: event.coupleOrHostName,
    eventDate: event.eventDate, eventEndDate: event.eventEndDate, venues: event.venues,
    estimatedGuestCount: event.estimatedGuestCount, actualGuestCount: event.actualGuestCount,
  };
  const clientSnapshot = {
    name: client?.name, businessName: client?.businessName, contactPerson: client?.contactPerson,
    email: client?.email, phone: client?.phone, address: [client?.businessAddress, client?.city, client?.state, client?.country].filter(Boolean).join(", "), gstNumber: client?.gstNumber,
  };
  const version = previous ? previous.version + 1 : 1;
  // Each revision needs a unique document number because quotationNumber has a unique index.
  // Preserve the original base in the immutable snapshot so later revisions do not nest suffixes.
  const baseQuotationNumber = previous?.snapshot?.baseQuotationNumber ?? previous?.quotationNumber;
  const quotationNumber = previous
    ? `${baseQuotationNumber}-R${version}`
    : `QT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const validUntil = new Date(data.validUntil);
  if (validUntil < new Date(new Date().toDateString())) throw new ApiError(422, "Quotation validity date cannot be in the past");
  const snapshot = {
    quotationNumber, baseQuotationNumber: baseQuotationNumber ?? quotationNumber, version, client: clientSnapshot, event: eventSnapshot,
    services: serviceSnapshots, lines: quoteLines, subtotal, taxRate: data.taxRate, taxAmount,
    discount: data.discount, grandTotal, currency: data.currency.toUpperCase(), rsvpIncluded: data.rsvpIncluded,
    paymentMilestones, terms: data.terms, validUntil, revisionReason: data.revisionReason,
  };
  const quote = await Quotation.create({
    quotationNumber, eventId: event._id, clientId: client._id, version,
    services: serviceSnapshots, lines: quoteLines, rsvpIncluded: data.rsvpIncluded,
    paymentMilestones, subtotal, taxRate: data.taxRate, taxAmount,
    additionalCharges: round2(quoteLines.filter((line) => line.kind === "ADDITIONAL" || line.kind === "EXPENSE").reduce((sum, line) => sum + line.amount, 0)),
    discount: data.discount, grandTotal, currency: data.currency.toUpperCase(), terms: data.terms,
    validUntil, revisionReason: data.revisionReason, supersedesQuotation: previous?._id, snapshot, createdBy: adminId,
  });
  if (previous) await Quotation.updateOne({ _id: previous._id, version: previous.version }, { $set: { status: "SUPERSEDED" } });
  if (event.status !== "QUOTATION_PENDING") {
    const changed = await Event.updateOne({ _id: event._id, status: event.status }, {
      $set: { status: "QUOTATION_PENDING" },
      $push: { statusHistory: { from: event.status, to: "QUOTATION_PENDING", changedBy: adminId, reason: data.revisionReason || "Quotation revision started", at: new Date() } },
    });
    if (!changed.modifiedCount) {
      await Quotation.deleteOne({ _id: quote._id, status: "DRAFT" });
      if (previous) await Quotation.updateOne({ _id: previous._id, version: previous.version, status: "SUPERSEDED" }, { $set: { status: previous.status } });
      throw new ApiError(409, "Event status changed while this quotation was being created; reload and try again");
    }
  }
  return quote;
}
