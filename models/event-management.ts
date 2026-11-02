import mongoose, { Schema, type Model } from "mongoose";

const ObjectId = Schema.Types.ObjectId;
const timestamps = { timestamps: true } as const;
const noId = { _id: false } as const;

function model(name: string, schema: Schema): Model<any> {
  return (mongoose.models[name] as Model<any> | undefined) ?? mongoose.model<any>(name, schema);
}

const venueSchema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
}, noId);

const lineSnapshotSchema = new Schema({
  kind: { type: String, enum: ["SERVICE", "MANPOWER", "EXPENSE", "ADDITIONAL"], required: true },
  sourceId: ObjectId,
  description: { type: String, required: true },
  quantity: { type: Number, min: 0, required: true },
  unit: { type: String, default: "" },
  unitRate: { type: Number, min: 0, required: true },
  amount: { type: Number, min: 0, required: true },
  rateCardVersion: Number,
  standardShiftHours: Number,
  overtimeRules: { type: Schema.Types.Mixed, default: undefined },
}, noId);

const eventHistorySchema = new Schema({
  from: String, to: String, changedBy: { type: ObjectId, ref: "User" }, reason: { type: String, default: "" }, at: { type: Date, default: Date.now },
}, noId);
const quoteServiceSnapshotSchema = new Schema({
  serviceId: { type: ObjectId, ref: "Service" }, name: String, description: String, quantity: { type: Number, min: 0, default: 1 },
  unit: String, unitRate: { type: Number, min: 0, default: 0 }, amount: { type: Number, min: 0, default: 0 }, approved: { type: Boolean, default: false },
}, noId);
const paymentMilestoneSchema = new Schema({
  name: { type: String, required: true }, percentage: { type: Number, min: 0, max: 100, required: true },
  amount: { type: Number, min: 0, required: true }, dueDescription: { type: String, required: true }, dueAt: Date,
}, noId);
const agreementSectionSchema = new Schema({
  number: { type: Number, min: 1, max: 17, required: true }, title: { type: String, required: true }, content: { type: String, required: true },
}, noId);
const acceptanceRecordSchema = new Schema({
  party: String, acceptedBy: String, acceptedAt: Date, method: String, reference: String,
}, noId);
const invitationReminderSchema = new Schema({ sentAt: Date, evidence: String }, noId);

const clientSchema = new Schema({
  name: { type: String, required: true, trim: true },
  businessName: { type: String, default: "", trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String, default: "" },
  businessAddress: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "India" },
  gstNumber: { type: String, default: "" },
  authorizedRepresentative: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, enum: ["ACTIVE", "INACTIVE", "ARCHIVED"], default: "ACTIVE", index: true },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);

const eventSchema = new Schema({
  clientId: { type: ObjectId, ref: "Client", required: true, index: true },
  eventName: { type: String, required: true, trim: true },
  eventType: { type: String, default: "" },
  coupleOrHostName: { type: String, default: "" },
  eventDate: { type: Date, required: true, index: true },
  eventEndDate: { type: Date, required: true },
  numberOfEventDays: { type: Number, min: 1, default: 1 },
  venues: { type: [venueSchema], default: [] },
  estimatedGuestCount: { type: Number, min: 0, default: 0 },
  actualGuestCount: { type: Number, min: 0 },
  description: { type: String, default: "" },
  internalNotes: { type: String, default: "" },
  status: {
    type: String,
    enum: ["DRAFT", "REQUIREMENTS_PENDING", "QUOTATION_PENDING", "QUOTATION_SENT", "QUOTATION_APPROVED", "AGREEMENT_PENDING", "AGREEMENT_SIGNED", "ADVANCE_PENDING", "CONFIRMED", "STAFF_PLANNING", "STAFF_DEPLOYMENT", "READY_FOR_EVENT", "IN_PROGRESS", "COMPLETED", "CANCELLED", "CLOSED"],
    default: "DRAFT", index: true,
  },
  statusHistory: { type: [eventHistorySchema], default: [] },
  closureSnapshot: { type: Schema.Types.Mixed, default: undefined },
  archivedAt: Date,
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
eventSchema.index({ clientId: 1, eventDate: -1 });
eventSchema.index({ status: 1, eventDate: 1 });

const serviceSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  category: { type: String, required: true },
  description: { type: String, default: "" },
  isOptional: { type: Boolean, default: false },
  isRegulated: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);

const rateCardSchema = new Schema({
  role: { type: String, required: true, trim: true },
  roleKey: { type: String, required: true, lowercase: true, trim: true },
  pricingUnit: { type: String, enum: ["PER_PERSON", "PER_SHIFT", "PER_EVENT"], required: true },
  rate: { type: Number, min: 0, required: true },
  currency: { type: String, default: "INR", uppercase: true },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  version: { type: Number, min: 1, required: true },
  isActive: { type: Boolean, default: true, index: true },
  standardShiftHours: { type: Number, min: 1, default: 12 },
  overtimeRules: { type: Schema.Types.Mixed, default: {} },
  notes: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
rateCardSchema.index({ roleKey: 1, version: 1 }, { unique: true });
rateCardSchema.index({ roleKey: 1, isActive: 1, effectiveFrom: -1 });

const manpowerRequirementSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  role: { type: String, required: true, trim: true },
  serviceId: { type: ObjectId, ref: "Service" },
  requiredQuantity: { type: Number, min: 1, required: true },
  activeAssignmentCount: { type: Number, min: 0, default: 0 },
  eventDate: { type: Date, required: true },
  shiftStart: { type: String, required: true },
  shiftEnd: { type: String, required: true },
  standardShiftHours: { type: Number, min: 1, required: true },
  dutyDescription: { type: String, default: "" },
  reportingLocation: { type: String, default: "" },
  specialInstructions: { type: String, default: "" },
  requiredSkills: { type: [String], default: [] },
  licenceReference: { type: String, default: "" },
  venuePermissionReference: { type: String, default: "" },
  writtenConfirmationReference: { type: String, default: "" },
  approvalStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
  approvedBy: { type: ObjectId, ref: "User" },
  approvedAt: Date,
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
manpowerRequirementSchema.index({ eventId: 1, eventDate: 1 });

const quotationSchema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  clientId: { type: ObjectId, ref: "Client", required: true, index: true },
  version: { type: Number, min: 1, required: true },
  services: { type: [quoteServiceSnapshotSchema], default: [] },
  lines: { type: [lineSnapshotSchema], default: [] },
  rsvpIncluded: { type: Boolean, default: false },
  paymentMilestones: { type: [paymentMilestoneSchema], default: [] },
  subtotal: { type: Number, min: 0, required: true },
  taxRate: { type: Number, min: 0, default: 0 },
  taxAmount: { type: Number, min: 0, default: 0 },
  additionalCharges: { type: Number, min: 0, default: 0 },
  discount: { type: Number, min: 0, default: 0 },
  grandTotal: { type: Number, min: 0, required: true },
  currency: { type: String, default: "INR" },
  terms: { type: [String], default: [] },
  validUntil: Date,
  status: { type: String, enum: ["DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED", "SUPERSEDED"], default: "DRAFT", index: true },
  sentAt: Date,
  deliveryReference: { type: String, default: "" },
  approvedAt: Date,
  approvedBy: { type: ObjectId, ref: "User" },
  approvalReference: { type: String, default: "" },
  revisionReason: { type: String, default: "" },
  supersedesQuotation: { type: ObjectId, ref: "Quotation" },
  snapshot: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
quotationSchema.index({ eventId: 1, version: 1 }, { unique: true });

const agreementSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  quotationId: { type: ObjectId, ref: "Quotation", required: true },
  version: { type: Number, min: 1, required: true },
  status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "SENT", "PARTIALLY_SIGNED", "SIGNED", "DECLINED", "CANCELLED", "SUPERSEDED"], default: "DRAFT", index: true },
  sections: { type: [agreementSectionSchema], default: [] },
  snapshot: { type: Schema.Types.Mixed, required: true },
  cancellationTerms: { type: String, default: "" },
  cancellationTermsInitialed: { type: Boolean, default: false },
  acceptanceRecords: { type: [acceptanceRecordSchema], default: [] },
  cancellationInitials: { type: [acceptanceRecordSchema], default: [] },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
agreementSchema.index({ eventId: 1, version: 1 }, { unique: true });

const assignmentSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  staffId: { type: ObjectId, ref: "Staff", required: true, index: true },
  requirementId: { type: ObjectId, ref: "ManpowerRequirement" },
  role: { type: String, required: true },
  eventDate: { type: Date, required: true, index: true },
  shiftStart: { type: String, required: true },
  shiftEnd: { type: String, required: true },
  duty: { type: String, default: "" },
  reportingLocation: { type: String, default: "" },
  instructions: { type: String, default: "" },
  status: { type: String, enum: ["DRAFT", "PENDING", "CONFIRMED", "REPLACED", "CANCELLED", "COMPLETED"], default: "PENDING", index: true },
  confirmationStatus: { type: String, enum: ["PENDING", "CONFIRMED", "DECLINED"], default: "PENDING" },
  replacedBy: { type: ObjectId, ref: "EventStaffAssignment" },
  notes: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
assignmentSchema.index({ staffId: 1, eventDate: 1, status: 1 });
assignmentSchema.index({ eventId: 1, staffId: 1, eventDate: 1, shiftStart: 1 });

const guestSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  name: { type: String, required: true, trim: true },
  contactNumber: { type: String, default: "" },
  email: { type: String, default: "", lowercase: true, trim: true },
  category: { type: String, default: "" },
  groupName: { type: String, default: "" },
  hostRelationship: { type: String, default: "" },
  arrivalDate: Date,
  departureDate: Date,
  travelMode: { type: String, default: "" },
  flightTrainDetails: { type: String, default: "" },
  roomRequired: { type: Boolean, default: false },
  specialRequests: { type: String, default: "" },
  dietaryRequirements: { type: String, default: "" },
  accessibilityNotes: { type: String, default: "" },
  rsvpStatus: { type: String, enum: ["PENDING", "CONFIRMED", "DECLINED"], default: "PENDING", index: true },
  checkInStatus: { type: String, enum: ["NOT_CHECKED_IN", "CHECKED_IN", "CHECKED_OUT"], default: "NOT_CHECKED_IN" },
  internalNotes: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
guestSchema.index({ eventId: 1, name: 1, contactNumber: 1 });
guestSchema.index({ eventId: 1, rsvpStatus: 1 });

const invitationSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  guestId: { type: ObjectId, ref: "Guest", required: true, index: true },
  status: { type: String, enum: ["NOT_SENT", "SENT", "DELIVERED", "CONFIRMED", "DECLINED", "NO_RESPONSE"], default: "NOT_SENT", index: true },
  sentAt: Date,
  deliveryEvidence: { type: String, default: "" },
  reminders: { type: [invitationReminderSchema], default: [] },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
invitationSchema.index({ eventId: 1, guestId: 1 }, { unique: true });

const rsvpSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  guestId: { type: ObjectId, ref: "Guest", required: true, index: true },
  status: { type: String, enum: ["PENDING", "CONFIRMED", "DECLINED"], required: true },
  travelDetails: { type: String, default: "" },
  recordedAt: { type: Date, default: Date.now },
  recordedBy: { type: ObjectId, ref: "User", required: true },
  evidence: { type: String, default: "" },
}, timestamps);
rsvpSchema.index({ eventId: 1, guestId: 1, recordedAt: -1 });

const roomSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  guestId: { type: ObjectId, ref: "Guest", required: true, index: true },
  hotelName: { type: String, default: "" },
  roomNumber: { type: String, default: "" },
  roomCategory: { type: String, default: "" },
  sharingWith: [{ type: ObjectId, ref: "Guest" }],
  checkInDate: Date,
  checkOutDate: Date,
  status: { type: String, enum: ["UNASSIGNED", "ASSIGNED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"], default: "UNASSIGNED", index: true },
  notes: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
roomSchema.index({ eventId: 1, hotelName: 1, roomNumber: 1, checkInDate: 1, checkOutDate: 1 });

const transportSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  guestIds: [{ type: ObjectId, ref: "Guest" }],
  mode: { type: String, enum: ["FLIGHT", "TRAIN", "BUS", "OTHER"], default: "OTHER" },
  referenceDetails: { type: String, default: "" },
  pickupAt: Date,
  pickupLocation: { type: String, default: "" },
  destination: { type: String, default: "" },
  luggageDetails: { type: String, default: "" },
  vehicle: { type: String, default: "" },
  driverName: { type: String, default: "" },
  driverPhone: { type: String, default: "" },
  plannerApprovalReference: { type: String, default: "" },
  status: { type: String, enum: ["PLANNED", "APPROVAL_PENDING", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "ISSUE_REPORTED", "CANCELLED"], default: "PLANNED", index: true },
  issue: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
transportSchema.index({ eventId: 1, pickupAt: 1 });

const taskSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  dueAt: Date,
  assignedTo: { type: ObjectId, ref: "User" },
  status: { type: String, enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"], default: "PENDING", index: true },
  notes: { type: String, default: "" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);

const shiftSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  assignmentId: { type: ObjectId, ref: "EventStaffAssignment", required: true, index: true },
  staffId: { type: ObjectId, ref: "Staff", required: true, index: true },
  shiftDate: { type: Date, required: true },
  shiftStart: { type: String, required: true },
  shiftEnd: { type: String, required: true },
  standardHours: { type: Number, min: 0, required: true },
  actualHours: { type: Number, min: 0 },
  overtimeHours: { type: Number, min: 0, default: 0 },
  overtimeStatus: { type: String, enum: ["NOT_REQUESTED", "PENDING", "APPROVED", "REJECTED"], default: "NOT_REQUESTED", index: true },
  overtimeAuthorizedBy: { type: ObjectId, ref: "User" },
  overtimeReference: { type: String, default: "" },
  overtimeServiceCharge: { type: Number, min: 0, default: 0 },
  rateCardVersion: Number,
  overtimeRuleSnapshot: { type: Schema.Types.Mixed, default: undefined },
  notes: { type: String, default: "" },
  correctedBy: { type: ObjectId, ref: "User" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
shiftSchema.index({ eventId: 1, staffId: 1, shiftDate: 1 });

const expenseSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  category: { type: String, required: true, index: true },
  description: { type: String, required: true },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, default: "INR" },
  date: { type: Date, required: true },
  vendor: { type: String, default: "" },
  requestedBy: { type: ObjectId, ref: "User", required: true },
  approvedBy: { type: ObjectId, ref: "User" },
  approvalStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
  paymentStatus: { type: String, enum: ["UNPAID", "PAID", "REIMBURSED"], default: "UNPAID" },
  receipt: { type: Schema.Types.Mixed },
  notes: { type: String, default: "" },
}, timestamps);
expenseSchema.index({ eventId: 1, date: -1 });

const invoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  clientId: { type: ObjectId, ref: "Client", required: true, index: true },
  quotationId: { type: ObjectId, ref: "Quotation", required: true },
  agreementId: { type: ObjectId, ref: "Agreement" },
  lines: { type: [lineSnapshotSchema], default: [] },
  subtotal: { type: Number, min: 0, required: true },
  taxAmount: { type: Number, min: 0, default: 0 },
  grandTotal: { type: Number, min: 0, required: true },
  amountReceived: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: "INR" },
  dueDate: Date,
  status: { type: String, enum: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID", "OVERDUE"], default: "DRAFT", index: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
invoiceSchema.index({ eventId: 1, createdAt: -1 });
invoiceSchema.index({ quotationId: 1 }, { unique: true });

const paymentSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  clientId: { type: ObjectId, ref: "Client", required: true, index: true },
  invoiceId: { type: ObjectId, ref: "Invoice", required: true, index: true },
  refundOf: { type: ObjectId, ref: "Payment" },
  amount: { type: Number, min: 0.01, required: true },
  amountRefunded: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: "INR" },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, enum: ["BANK_TRANSFER", "UPI", "CASH", "OTHER", "REFUND"], required: true },
  transactionReference: { type: String, default: "" },
  status: { type: String, enum: ["RECORDED", "REFUNDED", "VOID"], default: "RECORDED", index: true },
  milestone: { type: String, default: "" },
  notes: { type: String, default: "" },
  recordedBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);
paymentSchema.index({ invoiceId: 1, paymentDate: -1 });
paymentSchema.index({ invoiceId: 1, transactionReference: 1 }, { unique: true, partialFilterExpression: { transactionReference: { $type: "string", $gt: "" } } });

const changeSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  description: { type: String, required: true },
  requestedBy: { type: ObjectId, ref: "User", required: true },
  requestedAt: { type: Date, default: Date.now },
  approvalStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
  approvedBy: { type: ObjectId, ref: "User" },
  approvedAt: Date,
  writtenApprovalReference: { type: String, default: "" },
  additionalCost: { type: Number, min: 0, default: 0 },
  quotationId: { type: ObjectId, ref: "Quotation" },
  agreementId: { type: ObjectId, ref: "Agreement" },
  createdBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);

const documentSchema = new Schema({
  eventId: { type: ObjectId, ref: "Event", required: true, index: true },
  clientId: { type: ObjectId, ref: "Client", index: true },
  documentType: { type: String, required: true, index: true },
  file: { type: Schema.Types.Mixed, required: true },
  version: { type: Number, min: 1, default: 1 },
  snapshot: { type: Schema.Types.Mixed, default: undefined },
  uploadedBy: { type: ObjectId, ref: "User", required: true },
}, timestamps);

export const Client = model("Client", clientSchema);
export const Event = model("Event", eventSchema);
export const Service = model("Service", serviceSchema);
export const RateCard = model("RateCard", rateCardSchema);
export const ManpowerRequirement = model("ManpowerRequirement", manpowerRequirementSchema);
export const Quotation = model("Quotation", quotationSchema);
export const Agreement = model("Agreement", agreementSchema);
export const EventStaffAssignment = model("EventStaffAssignment", assignmentSchema);
export const Guest = model("Guest", guestSchema);
export const Invitation = model("Invitation", invitationSchema);
export const RSVP = model("RSVP", rsvpSchema);
export const RoomAllocation = model("RoomAllocation", roomSchema);
export const TransportSchedule = model("TransportSchedule", transportSchema);
export const EventTask = model("EventTask", taskSchema);
export const ShiftRecord = model("ShiftRecord", shiftSchema);
export const Expense = model("Expense", expenseSchema);
export const Invoice = model("Invoice", invoiceSchema);
export const Payment = model("Payment", paymentSchema);
export const EventChangeRequest = model("EventChangeRequest", changeSchema);
export const EventDocument = model("EventDocument", documentSchema);
