import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, pageParams, parseBody, plain, requireAuth } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { staffCreateSchema } from "@/lib/validators";
import { audit, notify } from "@/lib/notify";
import { Application, CandidateProfile, Staff, User } from "@/models";
import { documentsForApplication } from "@/lib/application-documents";
import { JOINING_LETTER_TERMS, JOINING_LETTER_VERSION } from "@/lib/agreements";

export const GET = handle(async (req: NextRequest) => {
  await requireAuth("ADMIN");
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams, 20);
  const [items, total] = await Promise.all([
    Staff.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("candidateId", "name email phone").lean(),
    Staff.countDocuments(),
  ]);
  return ok({ items: plain(items), total, page, limit });
});

async function nextEmployeeId() {
  const last = await Staff.findOne().sort({ employeeId: -1 }).select("employeeId").lean();
  const n = last ? parseInt(last.employeeId.replace(/\D/g, "")) || 0 : 0;
  return `EMP-${String(n + 1).padStart(4, "0")}`;
}

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAuth("ADMIN");
  const d = await parseBody(req, staffCreateSchema);
  await connectDB();
  const app = await Application.findById(oid(d.applicationId)).populate("positionId", "title location compensation");
  if (!app) throw new ApiError(404, "Application not found");
  if (app.status !== "SELECTED") throw new ApiError(409, "Only selected candidates can be converted to staff");
  if (await Staff.exists({ candidateId: app.candidateId })) throw new ApiError(409, "This candidate is already a staff member");
  const [profile, candidate] = await Promise.all([
    CandidateProfile.findOne({ userId: app.candidateId }).lean(),
    User.findById(app.candidateId).select("name email phone").lean(),
  ]);
  if (!candidate) throw new ApiError(404, "Candidate account not found");
  const applicationDocuments = documentsForApplication(profile);
  const photo = applicationDocuments.find((file) => file.documentType === "PASSPORT_PHOTO");
  const signature = applicationDocuments.find((file) => file.documentType === "SIGNATURE");
  if (!photo || !signature) throw new ApiError(422, "The candidate must have a passport-size photo and signature before creating the joining letter");
  const joiningDate = new Date(d.joiningDate);
  const address = [profile?.address, profile?.city, profile?.state, profile?.country, profile?.postalCode].filter(Boolean).join(", ");

  let staff;
  for (let attempt = 0; attempt < 3 && !staff; attempt++) {
    try {
      const employeeId = await nextEmployeeId();
      staff = await Staff.create({
        candidateId: app.candidateId, employeeId, joiningDate,
        position: app.positionId.title, documents: applicationDocuments, notes: d.notes,
        joiningLetter: {
          version: JOINING_LETTER_VERSION, issuedAt: new Date(), employeeId, joiningDate,
          position: app.positionId.title, location: app.positionId.location ?? "", compensation: app.positionId.compensation ?? "",
          candidateName: candidate.name, candidateEmail: candidate.email, candidatePhone: candidate.phone ?? "",
          dateOfBirth: profile?.dateOfBirth, address, photo, signature, terms: JOINING_LETTER_TERMS,
        },
      });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000 || attempt === 2) throw e; // retry employeeId collisions only
      if (await Staff.exists({ candidateId: app.candidateId })) throw new ApiError(409, "This candidate is already a staff member");
    }
  }
  await audit(admin._id, "Candidate converted to staff", "Staff", staff!._id, `${staff!.employeeId} - ${app.positionId.title}`);
  await notify(app.candidateId, "Your joining letter is ready", `Your joining date is ${joiningDate.toDateString()}. Your employee ID is ${staff!.employeeId}. Open My joining letter to view or print your copy.`, "SUCCESS");
  return ok(plain(staff), "Candidate converted to permanent staff", 201);
});
