import { z } from "zod";
import { EVENT_STATUSES } from "./event-constants";

const phone = z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number");
const validDate = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date");
const optionalDate = z.string().trim().optional().refine((value) => !value || !Number.isNaN(Date.parse(value)), "Enter a valid date");
const positiveAmount = z.coerce.number().finite().positive();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM time");

export const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessName: z.string().trim().max(160).default(""),
  contactPerson: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone,
  alternatePhone: z.string().trim().max(24).default(""),
  businessAddress: z.string().trim().max(500).default(""),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(100).default(""),
  country: z.string().trim().max(100).default("India"),
  gstNumber: z.string().trim().max(30).default(""),
  authorizedRepresentative: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(4000).default(""),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

const eventBaseSchema = z.object({
  clientId: z.string().min(1),
  eventName: z.string().trim().min(2).max(180),
  eventType: z.string().trim().max(100).default(""),
  coupleOrHostName: z.string().trim().max(180).default(""),
  eventDate: validDate,
  eventEndDate: validDate,
  numberOfEventDays: z.coerce.number().int().min(1).max(90).default(1),
  venues: z.array(z.object({ name: z.string().trim().min(1).max(180), address: z.string().trim().max(500).default(""), city: z.string().trim().max(100).default(""), state: z.string().trim().max(100).default("") })).min(1).max(30),
  estimatedGuestCount: z.coerce.number().int().min(0).max(100000).default(0),
  actualGuestCount: z.coerce.number().int().min(0).max(100000).optional(),
  description: z.string().trim().max(5000).default(""),
  internalNotes: z.string().trim().max(5000).default(""),
});

export const eventCreateSchema = eventBaseSchema.refine((value) => Date.parse(value.eventEndDate) >= Date.parse(value.eventDate), { path: ["eventEndDate"], message: "Event end date cannot be before the start date" });

export const eventUpdateSchema = eventBaseSchema.partial().omit({ clientId: true });
export const eventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
  reason: z.string().trim().max(1000).default(""),
  overrideReason: z.string().trim().max(1000).optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().max(3000).default(""),
  isOptional: z.boolean().default(false),
  isRegulated: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const rateCardSchema = z.object({
  role: z.string().trim().min(2).max(120),
  pricingUnit: z.enum(["PER_PERSON", "PER_SHIFT", "PER_EVENT"]),
  rate: positiveAmount,
  currency: z.string().trim().length(3).default("INR"),
  effectiveFrom: validDate,
  effectiveTo: optionalDate,
  isActive: z.boolean().default(true),
  standardShiftHours: z.coerce.number().positive().max(24).default(12),
  overtimeRules: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().trim().max(2000).default(""),
});

export const manpowerRequirementSchema = z.object({
  eventId: z.string().min(1),
  role: z.string().trim().min(2).max(120),
  serviceId: z.string().optional(),
  requiredQuantity: z.coerce.number().int().min(1).max(10000),
  eventDate: validDate,
  shiftStart: time,
  shiftEnd: time,
  standardShiftHours: z.coerce.number().positive().max(24),
  dutyDescription: z.string().trim().max(2000).default(""),
  reportingLocation: z.string().trim().max(300).default(""),
  specialInstructions: z.string().trim().max(3000).default(""),
  requiredSkills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  licenceReference: z.string().trim().max(500).default(""),
  venuePermissionReference: z.string().trim().max(500).default(""),
  writtenConfirmationReference: z.string().trim().max(500).default(""),
  approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

export const eventIdSchema = z.object({ eventId: z.string().min(1) });

const quoteServiceLineSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.coerce.number().positive().max(10000).default(1),
  unit: z.string().trim().min(2).max(40).default("per event"),
  unitRate: z.coerce.number().finite().min(0),
});
const quoteAdditionalLineSchema = z.object({
  kind: z.literal("ADDITIONAL"),
  description: z.string().trim().min(2).max(180),
  quantity: z.coerce.number().positive().max(10000),
  unit: z.string().trim().min(1).max(40),
  unitRate: z.coerce.number().finite().min(0),
});
const alternativeMilestoneSchema = z.object({
  name: z.string().trim().min(2).max(100),
  percentage: z.coerce.number().positive().max(100),
  dueDescription: z.string().trim().min(3).max(200),
  dueAt: optionalDate,
});

export const quotationCreateSchema = z.object({
  eventId: z.string().min(1),
  services: z.array(quoteServiceLineSchema).max(50).default([]),
  manpowerRequirementIds: z.array(z.string().min(1)).max(100).default([]),
  expenseIds: z.array(z.string().min(1)).max(100).default([]),
  additionalLines: z.array(quoteAdditionalLineSchema).max(50).default([]),
  taxRate: z.coerce.number().finite().min(0).max(100).default(0),
  discount: z.coerce.number().finite().min(0).default(0),
  currency: z.string().trim().length(3).default("INR"),
  rsvpIncluded: z.boolean().default(false),
  alternativeMilestones: z.array(alternativeMilestoneSchema).max(5).default([]),
  terms: z.array(z.string().trim().min(1).max(1000)).max(30).default([]),
  validUntil: optionalDate,
  revisionReason: z.string().trim().max(1000).default(""),
}).refine((d) => d.services.length + d.manpowerRequirementIds.length + d.expenseIds.length + d.additionalLines.length > 0, { message: "Add at least one priced service, approved manpower requirement, approved expense or additional line" })
  .refine((d) => !!d.validUntil, { path: ["validUntil"], message: "Set a quotation validity date" })
  .refine((d) => d.rsvpIncluded || Math.abs(d.alternativeMilestones.reduce((sum, item) => sum + item.percentage, 0) - 100) < 0.001, { path: ["alternativeMilestones"], message: "When RSVP is excluded, document alternative payment milestones totaling 100%" });

export const quotationStatusSchema = z.object({
  status: z.enum(["SENT", "APPROVED", "DECLINED", "EXPIRED"]),
  reference: z.string().trim().max(500).default(""),
});

export const agreementCreateSchema = z.object({
  eventId: z.string().min(1), quotationId: z.string().min(1), agreementDate: validDate,
  providerAddress: z.string().trim().max(500).default(""), providerRepresentative: z.string().trim().max(120).default(""),
  clientAddress: z.string().trim().max(500).default(""), clientRepresentative: z.string().trim().max(120).default(""),
  bankDetails: z.string().trim().max(500).default(""), taxDetails: z.string().trim().max(500).default(""),
  cancellationTerms: z.string().trim().max(3000).default(""), cancellationTermsInitialed: z.boolean().default(false),
  clientCancellationInitial: z.string().trim().max(500).default(""), providerCancellationInitial: z.string().trim().max(500).default(""),
});

export const agreementSendSchema = z.object({ reference: z.string().trim().min(1).max(500) });
export const agreementAcceptanceSchema = z.object({
  party: z.enum(["CLIENT", "PROVIDER"]), acceptedBy: z.string().trim().min(2).max(120),
  method: z.string().trim().min(2).max(80), reference: z.string().trim().min(1).max(500),
});

export const assignmentCreateSchema = z.object({ eventId: z.string().min(1), requirementId: z.string().min(1), staffId: z.string().min(1), notes: z.string().trim().max(1000).default("") });
export const assignmentStatusSchema = z.object({ status: z.enum(["CONFIRMED", "CANCELLED", "REPLACED"]), notes: z.string().trim().max(1000).default("") });

export const guestBaseSchema = z.object({
  eventId: z.string().min(1), name: z.string().trim().min(2).max(160), contactNumber: z.string().trim().max(24).default(""),
  email: z.string().trim().toLowerCase().email().or(z.literal("")).default(""), category: z.string().trim().max(80).default(""),
  groupName: z.string().trim().max(120).default(""), hostRelationship: z.string().trim().max(120).default(""),
  arrivalDate: optionalDate, departureDate: optionalDate, travelMode: z.string().trim().max(50).default(""), flightTrainDetails: z.string().trim().max(300).default(""),
  roomRequired: z.boolean().default(false), specialRequests: z.string().trim().max(1000).default(""), dietaryRequirements: z.string().trim().max(500).default(""),
  accessibilityNotes: z.string().trim().max(500).default(""), internalNotes: z.string().trim().max(1000).default(""),
});
export const guestSchema = guestBaseSchema.refine(d => !d.arrivalDate || !d.departureDate || Date.parse(d.departureDate) >= Date.parse(d.arrivalDate), { path: ["departureDate"], message: "Departure cannot be before arrival" });
export const rsvpSchema = z.object({ status: z.enum(["CONFIRMED","DECLINED","PENDING"]), evidence: z.string().trim().max(500).default(""), travelDetails: z.string().trim().max(1000).default("") });
export const guestAttendanceSchema = z.object({ checkInStatus: z.enum(["NOT_CHECKED_IN","CHECKED_IN","CHECKED_OUT"]) });
export const invitationSchema = z.object({ action: z.enum(["SENT","REMINDER"]), evidence: z.string().trim().min(1).max(500) });
export const roomAllocationSchema = z.object({ eventId: z.string().min(1), guestId: z.string().min(1), hotelName: z.string().trim().min(2).max(160), roomNumber: z.string().trim().max(40).default(""), roomCategory: z.string().trim().max(80).default(""), sharingWith: z.array(z.string().min(1)).max(10).default([]), checkInDate: validDate, checkOutDate: validDate, notes: z.string().trim().max(1000).default("") }).refine(d => Date.parse(d.checkOutDate) > Date.parse(d.checkInDate), { path: ["checkOutDate"], message: "Check-out must be after check-in" });
export const transportSchema = z.object({ eventId: z.string().min(1), guestIds: z.array(z.string().min(1)).min(1).max(100), mode: z.enum(["FLIGHT","TRAIN","BUS","OTHER"]), referenceDetails: z.string().trim().max(300).default(""), pickupAt: optionalDate, pickupLocation: z.string().trim().max(300).default(""), destination: z.string().trim().max(300).default(""), luggageDetails: z.string().trim().max(300).default(""), vehicle: z.string().trim().max(100).default(""), driverName: z.string().trim().max(120).default(""), driverPhone: z.string().trim().max(24).default(""), plannerApprovalReference: z.string().trim().max(500).default(""), status: z.enum(["PLANNED","APPROVAL_PENDING","APPROVED","ASSIGNED","IN_PROGRESS","COMPLETED","ISSUE_REPORTED","CANCELLED"]).default("PLANNED"), issue: z.string().trim().max(1000).default("") }).refine(d => !["APPROVED","ASSIGNED","IN_PROGRESS","COMPLETED"].includes(d.status) || !!d.plannerApprovalReference.trim(), { path: ["plannerApprovalReference"], message: "Planner approval reference is required before approval or assignment" });
export const roomStatusSchema = z.object({ status: z.enum(["ASSIGNED","CHECKED_IN","CHECKED_OUT","CANCELLED"]), notes: z.string().trim().max(1000).default("") });
export const transportStatusSchema = z.object({ status: z.enum(["PLANNED","APPROVAL_PENDING","APPROVED","ASSIGNED","IN_PROGRESS","COMPLETED","ISSUE_REPORTED","CANCELLED"]), plannerApprovalReference: z.string().trim().max(500).default(""), issue: z.string().trim().max(1000).default("") }).refine(d => !["APPROVED","ASSIGNED","IN_PROGRESS","COMPLETED"].includes(d.status) || !!d.plannerApprovalReference.trim(), { path: ["plannerApprovalReference"], message: "Planner approval reference is required" });
export const taskCreateSchema = z.object({ eventId:z.string().min(1), title:z.string().trim().min(2).max(180), description:z.string().trim().max(2000).default(""), dueAt:optionalDate, assignedTo:z.string().optional(), notes:z.string().trim().max(1000).default("") });
export const taskUpdateSchema = z.object({ status:z.enum(["PENDING","IN_PROGRESS","COMPLETED","BLOCKED"]), notes:z.string().trim().max(1000).default("") });
export const shiftCreateSchema = z.object({ assignmentId:z.string().min(1), actualHours:z.coerce.number().min(0).max(36), notes:z.string().trim().max(1000).default("") });
export const shiftCorrectionSchema = z.object({ actualHours:z.coerce.number().min(0).max(36), notes:z.string().trim().min(2).max(1000) });
export const overtimeDecisionSchema = z.object({ overtimeStatus:z.enum(["APPROVED","REJECTED"]), plannerAuthorizationReference:z.string().trim().max(500).default(""), reason:z.string().trim().max(1000).default("") }).refine(d=>d.overtimeStatus!=="APPROVED"||!!d.plannerAuthorizationReference.trim(),{path:["plannerAuthorizationReference"],message:"Planner authorization reference is required"});
export const eventChangeCreateSchema = z.object({ eventId:z.string().min(1), description:z.string().trim().min(5).max(3000), additionalCost:z.coerce.number().min(0).default(0), notes:z.string().trim().max(1000).default("") });
export const eventChangeDecisionSchema = z.object({ approvalStatus:z.enum(["APPROVED","REJECTED"]), writtenApprovalReference:z.string().trim().max(500).default(""), quotationId:z.string().optional(), agreementId:z.string().optional(), reason:z.string().trim().max(1000).default("") });
export const expenseSchema = z.object({ eventId:z.string().min(1),category:z.string().trim().min(2).max(80),description:z.string().trim().min(3).max(500),amount:positiveAmount,currency:z.string().trim().length(3).default("INR"),date:validDate,vendor:z.string().trim().max(180).default(""),notes:z.string().trim().max(2000).default("") });
export const expenseUpdateSchema = expenseSchema.omit({eventId:true}).partial();
export const expenseDecisionSchema = z.object({approvalStatus:z.enum(["APPROVED","REJECTED"]),reason:z.string().trim().min(2).max(1000)});
export const expensePaymentSchema = z.object({paymentStatus:z.enum(["UNPAID","PAID","REIMBURSED"]),reference:z.string().trim().max(500).default("")}).refine(d=>d.paymentStatus==="UNPAID"||!!d.reference.trim(),{path:["reference"],message:"Record payment evidence for this expense"});
export const invoiceCreateSchema = z.object({eventId:z.string().min(1),quotationId:z.string().min(1),agreementId:z.string().min(1),dueDate:optionalDate});
export const paymentSchema = z.object({invoiceId:z.string().min(1),amount:positiveAmount,currency:z.string().trim().length(3),paymentDate:validDate,paymentMethod:z.enum(["BANK_TRANSFER","UPI","CASH","OTHER"]),transactionReference:z.string().trim().max(180).default(""),milestone:z.string().trim().max(120).default(""),notes:z.string().trim().max(1000).default("")}).refine(d=>!["BANK_TRANSFER","UPI"].includes(d.paymentMethod)||!!d.transactionReference.trim(),{path:["transactionReference"],message:"A transaction reference is required for bank and UPI payments"});
export const refundSchema = z.object({invoiceId:z.string().min(1),paymentId:z.string().min(1),amount:positiveAmount,currency:z.string().trim().length(3),paymentDate:validDate,transactionReference:z.string().trim().min(1).max(180),notes:z.string().trim().min(2).max(1000)});

export const requirementApprovalSchema = z.object({
  approvalStatus: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(500).default(""),
});
