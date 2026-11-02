// End-to-end smoke test against an explicitly isolated local MongoDB test database.
// Usage: set MONGODB_TEST_URI=mongodb://127.0.0.1:27018/ruudraksha_phase10_test,
// PHASE10_SMTP_CAPTURE_FILE=<temporary file>, PHASE10_BASE_URL=http://127.0.0.1:3101; then run this file.
// This script drops only the explicitly named local database ruudraksha_phase10_test.
import { createRequire } from "node:module";
import { readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(`${process.cwd()}/package.json`);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const ts = require("typescript");
const Module = require("node:module").Module;
const uri = process.env.MONGODB_TEST_URI;
const otpCaptureFile = process.env.PHASE10_SMTP_CAPTURE_FILE;
const baseUrl = process.env.PHASE10_BASE_URL ?? "http://127.0.0.1:3101";
if (!uri || !otpCaptureFile) throw new Error("Set MONGODB_TEST_URI and PHASE10_SMTP_CAPTURE_FILE for isolated test services");
const target = new URL(uri);
const dbName = target.pathname.slice(1);
if (dbName !== "ruudraksha_phase10_test") throw new Error("Refusing to run: this harness is authorized only for ruudraksha_phase10_test");
if (!(["127.0.0.1", "localhost", "::1"].includes(target.hostname)) || !/_test$/i.test(dbName)) {
  throw new Error("Refusing to run: MONGODB_TEST_URI must use loopback and a database name ending in _test");
}
const appUrl = new URL(baseUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(appUrl.hostname)) throw new Error("PHASE10_BASE_URL must use loopback");
const resolvedCapture = resolve(otpCaptureFile);
if (!resolvedCapture.toLowerCase().startsWith(resolve(tmpdir()).toLowerCase())) throw new Error("OTP capture must be stored under the operating-system temporary directory");

let passed = 0;
const checks = [];
function check(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed++;
  checks.push(message);
  process.stdout.write(`PASS ${passed}: ${message}\n`);
}
async function request(path, method = "GET", body, token) {
  const headers = {};
  if (token) headers.Cookie = `session=${token}`;
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(new URL(path, appUrl), {
    method, headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, data };
}
async function expect(path, method, body, token, status, label) {
  const result = await request(path, method, body, token);
  if (result.response.status !== status) throw new Error(`${label}: expected ${status}, got ${result.response.status}: ${JSON.stringify(result.data)}`);
  check(true, label);
  return result.data?.data;
}
function id(value) { return String(value?._id ?? value?.id ?? value); }
const adminId = new mongoose.Types.ObjectId();
const testPassword = "Phase10-test-only-password";
let adminToken;
let candidateToken;
let candidateId;

const modelPath = resolve(process.cwd(), "models/event-management.ts");
const modelSource = await readFile(modelPath, "utf8");
const compiledModels = ts.transpileModule(modelSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const modelLoader = new Module(modelPath);
modelLoader.filename = modelPath;
modelLoader.paths = Module._nodeModulePaths(dirname(modelPath));
modelLoader._compile(compiledModels, modelPath);
const eventModelEntries = Object.entries(modelLoader.exports).filter(([, model]) => model && typeof model.init === "function");

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db;
  await db.dropDatabase();
  const passwordHash = await bcrypt.hash(testPassword, 4);
  await db.collection("users").insertOne(
    { _id: adminId, name: "Phase 10 Admin", email: "phase10-admin@example.invalid", phone: "+10000000001", passwordHash, role: "ADMIN", isActive: true, createdAt: new Date(), updatedAt: new Date() },
  );

  const anonymousEventApi = await request("/api/clients");
  check(anonymousEventApi.response.status === 401, `unauthenticated admin API is denied (received ${anonymousEventApi.response.status})`);
  const adminLogin = await request("/api/auth/login", "POST", { email: "phase10-admin@example.invalid", password: testPassword, adminOnly: true });
  check(adminLogin.response.status === 200, "ADMIN login issues a server-signed test session");
  adminToken = adminLogin.response.headers.get("set-cookie")?.match(/(?:^|,\s*)session=([^;]+)/)?.[1];
  check(!!adminToken, "ADMIN login response sets session cookie");
  const registrationEmail = "phase10-registration@example.invalid";
  const registered = await request("/api/auth/register", "POST", { name: "Phase 10 Candidate", email: registrationEmail, phone: "+10000000002", password: testPassword, confirmPassword: testPassword });
  check(registered.response.status === 200, `candidate registration sends OTP to the local test SMTP sink (received ${registered.response.status}: ${JSON.stringify(registered.data)})`);
  const message = await readFile(resolvedCapture, "utf8");
  await rm(resolvedCapture, { force: true });
  const otp = message.match(/verification code is\s+(\d{6})/i)?.[1];
  check(!!otp, "OTP is captured privately by the local test sink and not printed");
  const wrongOtp = String((Number(otp) + 1) % 1_000_000).padStart(6, "0");
  check((await request("/api/auth/register/verify", "POST", { email: registrationEmail, otp: wrongOtp })).response.status === 400, "incorrect registration OTP is rejected");
  const verified = await request("/api/auth/register/verify", "POST", { email: registrationEmail, otp });
  check(verified.response.status === 201, "correct registration OTP creates the candidate account");
  candidateToken = verified.response.headers.get("set-cookie")?.match(/(?:^|,\s*)session=([^;]+)/)?.[1];
  check(!!candidateToken, "OTP verification sets candidate session cookie");
  const candidateMe = await request("/api/auth/me", "GET", undefined, candidateToken);
  candidateId = new mongoose.Types.ObjectId(candidateMe.data?.data?.id);
  check(candidateMe.response.status === 200 && !!candidateId, "verified candidate session authenticates against the test database");
  check((await request("/api/clients", "GET", undefined, candidateToken)).response.status === 403, "candidate role is denied admin event API");

  // Recruitment profile -> application -> review -> interview -> selection -> staff conversion.
  const profile = {
    dateOfBirth: "1998-04-12", gender: "OTHER", address: "1 Test Lane", city: "Test City", state: "Test State", country: "India", postalCode: "100001",
    skills: ["Hospitality"], experience: "Test experience", yearsOfExperience: 2, languages: ["English"], availability: "Available",
    emergencyContact: { name: "Test Contact", phone: "+10000000003", relation: "Friend" },
  };
  await expect("/api/candidates/profile", "PUT", profile, candidateToken, 200, "candidate profile completion");
  const invalidUpload = new FormData();
  invalidUpload.set("documentType", "PASSPORT_PHOTO");
  invalidUpload.set("file", new File(["not an image"], "phase10-invalid.png", { type: "image/png" }));
  check((await request("/api/candidates/documents", "POST", invalidUpload, candidateToken)).response.status === 422, "invalid document bytes are rejected before Cloudinary upload");
  await db.collection("candidateprofiles").updateOne({ userId: candidateId }, { $set: { documents: ["PASSPORT_PHOTO", "SIGNATURE"].map((type) => ({ publicId: `wedding-staff/candidates/${candidateId}/documents/phase10-${type.toLowerCase()}`, resourceType: "image", fileName: `phase10-${type.toLowerCase()}.png`, documentType: type, format: "png", bytes: 32, uploadedAt: new Date() })) } });
  check(true, "test-only required document metadata seeded after upload validation; real Cloudinary upload remains untested");
  const position = await expect("/api/positions", "POST", { title: "Phase 10 Test Role", description: "A test-only hospitality role for flow verification.", location: "Test venue", employmentType: "FULL_TIME", openings: 1, applicationDeadline: "2027-12-31", requiredDocuments: [], status: "ACTIVE" }, adminToken, 201, "admin creates recruitment position");
  const application = await expect("/api/applications", "POST", { positionId: id(position), confirm: true, agreementAccepted: true, answers: { coverNote: "Test application" } }, candidateToken, 201, "candidate job application");
  const applicationId = id(application);
  await expect(`/api/applications/${applicationId}`, "PUT", { status: "UNDER_REVIEW" }, adminToken, 200, "admin application review");
  await expect(`/api/applications/${applicationId}`, "PUT", { status: "SHORTLISTED" }, adminToken, 200, "candidate shortlisted");
  await expect("/api/interviews", "POST", { applicationId, date: "2026-12-05", time: "10:00", type: "PHONE", interviewer: "Test Admin" }, adminToken, 201, "interview scheduling");
  await expect(`/api/applications/${applicationId}`, "PUT", { status: "INTERVIEWED" }, adminToken, 200, "interview completion");
  await expect(`/api/applications/${applicationId}`, "PUT", { status: "SELECTED" }, adminToken, 200, "candidate selection");
  const staff = await expect("/api/admin/staff", "POST", { applicationId, joiningDate: "2027-01-01", notes: "Isolated integration fixture" }, adminToken, 201, "selected candidate converts to existing Staff record and joining letter");

  // One complete commercial path through approved quotation, agreement evidence and real payment records.
  const client = await expect("/api/clients", "POST", { name: "Phase 10 Test Client", contactPerson: "Test Planner", email: "phase10-client@example.invalid", phone: "+10000000004" }, adminToken, 201, "test client creation");
  const event = await expect("/api/events", "POST", { clientId: id(client), eventName: "Phase 10 Test Event", eventType: "Wedding", coupleOrHostName: "Test Host", eventDate: "2026-12-20", eventEndDate: "2026-12-21", numberOfEventDays: 2, venues: [{ name: "Test Venue", city: "Test City" }], estimatedGuestCount: 2 }, adminToken, 201, "draft event creation");
  const eventId = id(event);
  const service = await expect("/api/services", "POST", { name: "Phase 10 Invitations & RSVP", category: "Invitations & RSVP", description: "Test-only service", isOptional: true, isRegulated: false, isActive: true }, adminToken, 201, "event service creation");
  await expect(`/api/events/${eventId}/status`, "PUT", { status: "REQUIREMENTS_PENDING", reason: "Test" }, adminToken, 200, "event requirements transition");
  const rate = await expect("/api/rate-cards", "POST", { role: "Welcome Hostess", pricingUnit: "PER_SHIFT", rate: 2000, currency: "INR", effectiveFrom: "2026-01-01", isActive: true, standardShiftHours: 8, overtimeRules: { firstExtensionHours: 4, firstExtensionMultiplier: 0.5, nextExtensionHours: 4, nextExtensionMultiplier: 0.5 } }, adminToken, 201, "test-only rate card configuration");
  const requirement = await expect("/api/manpower-requirements", "POST", { eventId, role: "Welcome Hostess", requiredQuantity: 2, eventDate: "2026-12-20", shiftStart: "22:00", shiftEnd: "02:00", standardShiftHours: 8, dutyDescription: "Test overnight shift" }, adminToken, 201, "event manpower requirement");
  await expect(`/api/manpower-requirements/${id(requirement)}`, "PUT", { approvalStatus: "APPROVED", reason: "Test approval" }, adminToken, 200, "manpower approval");
  await expect(`/api/events/${eventId}/status`, "PUT", { status: "QUOTATION_PENDING", reason: "Test" }, adminToken, 200, "quotation workflow transition");
  const quoteInput = { eventId, services: [{ serviceId: id(service), quantity: 1, unit: "per event", unitRate: 1000 }], manpowerRequirementIds: [id(requirement)], additionalLines: [], taxRate: 18, discount: 100, currency: "INR", rsvpIncluded: true, validUntil: "2026-12-01", terms: ["Test terms"] };
  const quote1 = await expect("/api/quotations", "POST", quoteInput, adminToken, 201, "quotation generation");
  check(quote1.subtotal === 5000 && quote1.taxAmount === 900 && quote1.grandTotal === 5800, "quotation subtotal, tax, discount and grand total calculation");
  check(quote1.paymentMilestones.map((m) => m.percentage).join(",") === "50,30,20", "RSVP payment milestones are 50/30/20");
  const quote2 = await expect(`/api/quotations/${id(quote1)}/revise`, "POST", { ...quoteInput, revisionReason: "Test revision" }, adminToken, 201, "quotation revision creates a new version");
  check(quote2.version === 2 && quote2.snapshot.grandTotal === 5800, "quotation revision snapshot is versioned");
  const quoteSnapshotBeforeEdit = JSON.stringify(quote2.snapshot);
  await expect(`/api/services/${id(service)}`, "PUT", { description: "Edited after quotation snapshot" }, adminToken, 200, "service catalogue later edit");
  await expect("/api/rate-cards", "POST", { role: "Welcome Hostess", pricingUnit: "PER_SHIFT", rate: 9000, currency: "INR", effectiveFrom: "2027-01-01", isActive: true, standardShiftHours: 8, overtimeRules: {} }, adminToken, 201, "later rate-card version");
  const storedQuote = await db.collection("quotations").findOne({ _id: new mongoose.Types.ObjectId(id(quote2)) });
  check(JSON.stringify(storedQuote.snapshot) === quoteSnapshotBeforeEdit && storedQuote.lines.find((line) => line.kind === "MANPOWER").unitRate === 2000, "quotation snapshot and rate stay unchanged after source edits");
  await expect(`/api/quotations/${id(quote2)}/status`, "PUT", { status: "SENT", reference: "Test delivery evidence" }, adminToken, 200, "quotation manual-send reference");
  await expect(`/api/quotations/${id(quote2)}/status`, "PUT", { status: "APPROVED", reference: "Test client approval" }, adminToken, 200, "quotation approval evidence");
  const agreement = await expect("/api/agreements", "POST", { eventId, quotationId: id(quote2), agreementDate: "2026-11-01" }, adminToken, 201, "agreement generation");
  check(agreement.sections.length === 17, "agreement contains all 17 README clauses");
  const agreementSnapshotBeforeEdit = JSON.stringify(agreement.snapshot);
  await expect(`/api/events/${eventId}`, "PUT", { coupleOrHostName: "Edited host after agreement snapshot" }, adminToken, 200, "event details later edit");
  const storedAgreement = await db.collection("agreements").findOne({ _id: new mongoose.Types.ObjectId(id(agreement)) });
  check(JSON.stringify(storedAgreement.snapshot) === agreementSnapshotBeforeEdit, "agreement snapshot remains unchanged after source event edit");
  await expect(`/api/agreements/${id(agreement)}/status`, "PUT", { reference: "Test agreement delivery" }, adminToken, 200, "agreement sent evidence");
  await expect(`/api/agreements/${id(agreement)}/acceptance`, "POST", { party: "CLIENT", acceptedBy: "Test Planner", method: "Manual test record", reference: "CLIENT-TEST-1" }, adminToken, 200, "client agreement acceptance");
  await expect(`/api/agreements/${id(agreement)}/acceptance`, "POST", { party: "PROVIDER", acceptedBy: "Test Admin", method: "Manual test record", reference: "PROVIDER-TEST-1" }, adminToken, 200, "provider agreement acceptance and event signing");
  const invoice = await expect("/api/invoices", "POST", { eventId, quotationId: id(quote2), agreementId: id(agreement), dueDate: "2026-12-15" }, adminToken, 201, "invoice snapshots approved quote and signed agreement");
  check(invoice.amountReceived === 0, "invoice creation does not mark payment received");
  await expect(`/api/events/${eventId}/status`, "PUT", { status: "ADVANCE_PENDING", reason: "Test" }, adminToken, 200, "advance-pending status");
  const payment = await expect("/api/payments", "POST", { invoiceId: id(invoice), amount: 2900, currency: "INR", paymentDate: "2026-11-02", paymentMethod: "BANK_TRANSFER", transactionReference: "PHASE10-ADVANCE-1", milestone: "Agreement signing advance" }, adminToken, 201, "actual advance payment recorded");
  await expect(`/api/events/${eventId}/status`, "PUT", { status: "CONFIRMED", reason: "Test confirmation" }, adminToken, 200, "event confirmation after required advance");

  // Guest operations, duplicate/conflict checks, shifts/overtime, finance and closure.
  const guest = await expect("/api/guests", "POST", { eventId, name: "Phase 10 Guest", email: "phase10-guest@example.invalid", contactNumber: "+10000000005" }, adminToken, 201, "event guest creation");
  const transport = await expect("/api/transport-schedules", "POST", { eventId, guestIds: [id(guest)], mode: "BUS", status: "PLANNED", pickupAt: "2026-12-19T12:00:00.000Z", pickupLocation: "Test Hotel", destination: "Test Venue" }, adminToken, 201, "transport schedule creation");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "APPROVED" }, adminToken, 422, "transport cannot be approved without Planner evidence");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "APPROVAL_PENDING" }, adminToken, 200, "transport enters approval queue");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "APPROVED", plannerApprovalReference: "Planner-test-transport" }, adminToken, 200, "transport approval stores Planner evidence");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "ASSIGNED", plannerApprovalReference: "Planner-test-transport" }, adminToken, 200, "approved transport is assigned");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "ISSUE_REPORTED", issue: "Test-only delay" }, adminToken, 200, "transport issue is recorded");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "ASSIGNED", plannerApprovalReference: "Planner-test-transport" }, adminToken, 200, "transport returns to assigned after issue resolution");
  check((await request(`/api/transport-schedules/export?eventId=${eventId}`, "GET", undefined, adminToken)).response.status === 200, "transport schedule export");
  await expect(`/api/guests/${id(guest)}/rsvp`, "POST", { status: "CONFIRMED", evidence: "Test RSVP evidence" }, adminToken, 201, "RSVP evidence recording");
  await expect(`/api/guests/${id(guest)}/invitation`, "POST", { action: "SENT", evidence: "Test invitation delivery evidence" }, adminToken, 201, "manual invitation evidence");
  await expect("/api/room-allocations", "POST", { eventId, guestId: id(guest), hotelName: "Test Hotel", roomNumber: "101", checkInDate: "2026-12-19", checkOutDate: "2026-12-22" }, adminToken, 201, "room allocation");
  const guest2 = await expect("/api/guests", "POST", { eventId, name: "Phase 10 Guest Two", email: "phase10-guest2@example.invalid", contactNumber: "+10000000006" }, adminToken, 201, "second event guest");
  await expect("/api/room-allocations", "POST", { eventId, guestId: id(guest2), hotelName: "Test Hotel", roomNumber: "101", checkInDate: "2026-12-20", checkOutDate: "2026-12-21" }, adminToken, 409, "overlapping room occupancy is rejected");
  const imported = await expect("/api/guests/import", "POST", { eventId, csv: "name,email\r\nImported Test Guest,phase10-import@example.invalid" }, adminToken, 200, "guest CSV import");
  check(imported.added === 1, "guest CSV imports a valid row");
  check((await request(`/api/guests/export?eventId=${eventId}`, "GET", undefined, adminToken)).response.status === 200, "guest CSV export");

  const task = await expect("/api/event-tasks", "POST", { eventId, title: "Phase 10 test task", description: "Exercise task state transitions" }, adminToken, 201, "event task creation");
  await expect(`/api/event-tasks/${id(task)}`, "PUT", { status: "IN_PROGRESS", notes: "Started" }, adminToken, 200, "event task state update");
  const assignment = await expect("/api/event-assignments", "POST", { eventId, requirementId: id(requirement), staffId: id(staff) }, adminToken, 201, "assignment uses existing Staff record");
  await expect("/api/event-assignments", "POST", { eventId, requirementId: id(requirement), staffId: id(staff) }, adminToken, 409, "duplicate assignment rejected");
  const capacityRequirement = await expect("/api/manpower-requirements", "POST", { eventId, role: "Test Capacity Role", requiredQuantity: 1, eventDate: "2026-12-21", shiftStart: "08:00", shiftEnd: "09:00", standardShiftHours: 1, dutyDescription: "Capacity test" }, adminToken, 201, "single-capacity manpower requirement");
  await expect(`/api/manpower-requirements/${id(capacityRequirement)}`, "PUT", { approvalStatus: "APPROVED", reason: "Capacity test" }, adminToken, 200, "capacity requirement approval");
  const capacityAssignment = await expect("/api/event-assignments", "POST", { eventId, requirementId: id(capacityRequirement), staffId: id(staff) }, adminToken, 201, "single-slot capacity assignment");
  await expect("/api/event-assignments", "POST", { eventId, requirementId: id(capacityRequirement), staffId: id(staff) }, adminToken, 409, "full manpower capacity rejects another assignment");
  await expect(`/api/event-assignments/${id(capacityAssignment)}`, "PUT", { status: "CANCELLED", notes: "Release test slot" }, adminToken, 200, "capacity fixture slot released");
  const overnightConflict = await expect("/api/manpower-requirements", "POST", { eventId, role: "Overnight Conflict Role", requiredQuantity: 1, eventDate: "2026-12-21", shiftStart: "01:00", shiftEnd: "04:00", standardShiftHours: 3, dutyDescription: "Overnight overlap test" }, adminToken, 201, "next-day overlap requirement");
  await expect(`/api/manpower-requirements/${id(overnightConflict)}`, "PUT", { approvalStatus: "APPROVED", reason: "Overlap test" }, adminToken, 200, "overnight overlap requirement approval");
  await expect("/api/event-assignments", "POST", { eventId, requirementId: id(overnightConflict), staffId: id(staff) }, adminToken, 409, "overnight shift overlap is rejected across midnight");
  await expect(`/api/event-assignments/${id(assignment)}`, "PUT", { status: "CONFIRMED", notes: "Test" }, adminToken, 200, "staff assignment confirmation");
  const change = await expect("/api/event-changes", "POST", { eventId, description: "Adjust a test event schedule", additionalCost: 0 }, adminToken, 201, "event change request");
  await expect(`/api/event-changes/${id(change)}`, "PUT", { approvalStatus: "APPROVED", writtenApprovalReference: "Planner-test-approval", quotationId: id(quote2), agreementId: id(agreement), reason: "Test" }, adminToken, 200, "event change requires and stores written approval");
  await expect("/api/events/" + eventId + "/status", "PUT", { status: "STAFF_PLANNING", reason: "Test" }, adminToken, 200, "staff planning status");
  await expect("/api/events/" + eventId + "/status", "PUT", { status: "STAFF_DEPLOYMENT", reason: "Test" }, adminToken, 200, "staff deployment status");
  await expect("/api/events/" + eventId + "/status", "PUT", { status: "READY_FOR_EVENT", reason: "Test" }, adminToken, 200, "event ready status");
  await expect("/api/events/" + eventId + "/status", "PUT", { status: "IN_PROGRESS", reason: "Test" }, adminToken, 200, "event in-progress status");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "IN_PROGRESS", plannerApprovalReference: "Planner-test-transport" }, adminToken, 200, "transport starts during the event");
  await expect(`/api/transport-schedules/${id(transport)}`, "PUT", { status: "COMPLETED", plannerApprovalReference: "Planner-test-transport" }, adminToken, 200, "transport completes");
  const shift = await expect("/api/shifts", "POST", { assignmentId: id(assignment), actualHours: 10, notes: "Test shift" }, adminToken, 201, "shift and overtime calculation");
  check(shift.overtimeHours === 2 && shift.overtimeStatus === "PENDING", "overtime remains pending until Planner authorization evidence");
  await expect(`/api/shifts/${id(shift)}`, "PATCH", { overtimeStatus: "APPROVED", plannerAuthorizationReference: "Planner-test-overtime", reason: "Test" }, adminToken, 200, "overtime approval with Planner evidence");

  const expense = await expect("/api/expenses", "POST", { eventId, category: "Travel", description: "Test-only expense", amount: 100, currency: "INR", date: "2026-12-19", notes: "Test expense" }, adminToken, 201, "expense submission");
  await expect(`/api/expenses/${id(expense)}/approval`, "PUT", { approvalStatus: "APPROVED", reason: "Test approval" }, adminToken, 200, "expense approval");
  const payment2 = await expect("/api/payments", "POST", { invoiceId: id(invoice), amount: 100, currency: "INR", paymentDate: "2026-12-19", paymentMethod: "UPI", transactionReference: "PHASE10-PAYMENT-2", milestone: "Final test payment" }, adminToken, 201, "partial invoice payment");
  const refund = await expect("/api/payments/refund", "POST", { invoiceId: id(invoice), paymentId: id(payment2), amount: 50, currency: "INR", paymentDate: "2026-12-20", transactionReference: "PHASE10-REFUND-1", notes: "Test refund" }, adminToken, 201, "refund linked to original payment");
  const privateReceiptPath = `/api/files?publicId=wedding-staff/events/${eventId}/expenses/${id(expense)}-00000000-0000-4000-8000-000000000000&type=raw`;
  check((await request(privateReceiptPath)).response.status === 401, "private event receipt path denies public access");
  check((await request(privateReceiptPath, "GET", undefined, candidateToken)).response.status === 403, "private event receipt denies candidate access");
  const anotherCandidatePath = "/api/files?publicId=wedding-staff/candidates/000000000000000000000001/documents/passport-photo&type=image";
  check((await request(anotherCandidatePath, "GET", undefined, candidateToken)).response.status === 403, "candidate cannot access another candidate's private document");
  for (const [path, label] of [[`/api/agreements/${id(agreement)}/pdf`, "agreement PDF"], [`/api/invoices/${id(invoice)}/pdf`, "invoice PDF"], [`/api/payments/${id(payment)}/receipt`, "payment receipt PDF"], [`/api/payments/${id(refund)}/receipt`, "refund receipt PDF"]]) {
    const response = await request(path, "GET", undefined, adminToken);
    check(response.response.headers.get("content-type")?.includes("application/pdf") && String(response.data).startsWith("%PDF-1.4"), label);
  }

  await expect(`/api/event-tasks/${id(task)}`, "PUT", { status: "COMPLETED", notes: "Done" }, adminToken, 200, "event task completion");
  await expect(`/api/events/${eventId}/status`, "PUT", { status: "COMPLETED", reason: "Test complete" }, adminToken, 200, "event completion");
  const closed = await expect(`/api/events/${eventId}/status`, "PUT", { status: "CLOSED", reason: "Phase 10 test closure" }, adminToken, 200, "event closure snapshot");
  check(closed.closureSnapshot.invoiceTotalsByCurrency.INR.outstanding === 2850, "closure snapshot preserves currency-specific net outstanding balance");
  check(closed.closureSnapshot.transportIssueCount === 0 && closed.closureSnapshot.guestCount === 3, "closure snapshot includes resolved transport issues and guest total");
  check((await request("/admin/reports", "GET", undefined, adminToken)).response.status === 200, "reports and audit viewer page");
  check((await db.collection("auditlogs").countDocuments({ adminId })).valueOf() > 0, "test admin actions are present in the audit log collection");

  const eventModels = ["clients", "events", "services", "ratecards", "manpowerrequirements", "quotations", "agreements", "eventstaffassignments", "guests", "invitations", "rsvps", "roomallocations", "transportschedules", "eventtasks", "shiftrecords", "expenses", "invoices", "payments", "eventchangerequests", "eventdocuments"];
  check(eventModelEntries.length === 20, `20 Mongoose event model schemas load from source (${eventModelEntries.length}/20)`);
  await Promise.all(eventModelEntries.map(([, model]) => model.init()));
  const indexSnapshot = await Promise.all(eventModelEntries.map(async ([, model]) => [model.collection.name, await model.collection.indexes()]));
  await Promise.all(eventModelEntries.map(([, model]) => model.init()));
  const repeatedIndexSnapshot = await Promise.all(eventModelEntries.map(async ([, model]) => [model.collection.name, await model.collection.indexes()]));
  check(JSON.stringify(indexSnapshot) === JSON.stringify(repeatedIndexSnapshot), "repeated Mongoose model initialization preserves the same indexes without dropping/rebuilding them");
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const present = eventModels.filter((name) => existing.has(name));
  check(present.length === 20, `all event model collections were initialized (${present.length}/20)`);
  const expectedIndexes = {
    clients: "email_1", events: "clientId_1_eventDate_-1", services: "name_1", ratecards: "roleKey_1_version_1",
    manpowerrequirements: "eventId_1_eventDate_1", quotations: "eventId_1_version_1", agreements: "eventId_1_version_1",
    eventstaffassignments: "staffId_1_eventDate_1_status_1", guests: "eventId_1_name_1_contactNumber_1", invitations: "eventId_1_guestId_1",
    rsvps: "eventId_1_guestId_1_recordedAt_-1", roomallocations: "eventId_1_hotelName_1_roomNumber_1_checkInDate_1_checkOutDate_1",
    transportschedules: "eventId_1_pickupAt_1", eventtasks: "eventId_1", shiftrecords: "eventId_1_staffId_1_shiftDate_1",
    expenses: "eventId_1_date_-1", invoices: "quotationId_1", payments: "invoiceId_1_transactionReference_1",
    eventchangerequests: "eventId_1", eventdocuments: "eventId_1",
  };
  for (const [collection, indexName] of Object.entries(expectedIndexes)) {
    check((await db.collection(collection).indexes()).some((index) => index.name === indexName), `${collection}.${indexName} index exists`);
  }
  const uniqueIndexes = [
    ["services", "name_1"], ["ratecards", "roleKey_1_version_1"], ["quotations", "quotationNumber_1"], ["quotations", "eventId_1_version_1"],
    ["agreements", "eventId_1_version_1"], ["invitations", "eventId_1_guestId_1"], ["invoices", "invoiceNumber_1"],
    ["invoices", "quotationId_1"], ["payments", "invoiceId_1_transactionReference_1"],
  ];
  for (const [collection, indexName] of uniqueIndexes) {
    const index = (await db.collection(collection).indexes()).find((item) => item.name === indexName);
    check(!!index?.unique, `${collection}.${indexName} unique index exists`);
  }
  let duplicateServiceRejected = false;
  try { await db.collection("services").insertOne({ name: "Phase 10 Invitations & RSVP", _id: new mongoose.Types.ObjectId() }); }
  catch (error) { duplicateServiceRejected = error?.code === 11000; }
  check(duplicateServiceRejected, "duplicate service name is rejected by unique index");
  let duplicateQuoteVersionRejected = false;
  try { await db.collection("quotations").insertOne({ _id: new mongoose.Types.ObjectId(), quotationNumber: "PHASE10-DUPLICATE-TEST", eventId: new mongoose.Types.ObjectId(eventId), version: 2 }); }
  catch (error) { duplicateQuoteVersionRejected = error?.code === 11000; }
  check(duplicateQuoteVersionRejected, "duplicate event quotation version is rejected by unique index");
  const before = await db.collection("quotations").indexes();
  await mongoose.disconnect();
  await mongoose.connect(uri);
  const after = await mongoose.connection.db.collection("quotations").indexes();
  check(JSON.stringify(before.map((x) => [x.name, x.key, x.unique ?? false])) === JSON.stringify(after.map((x) => [x.name, x.key, x.unique ?? false])), "repeated connection leaves quotation indexes intact");
  console.log(`PASS ${passed} end-to-end checks against isolated database ${dbName}`);
  checks.forEach((item) => console.log(`  PASS ${item}`));
} finally {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
