import mongoose, { Schema, Model, Types } from "mongoose";
import {
  APPLICATION_STATUSES, POSITION_STATUSES, EMPLOYMENT_TYPES, INTERVIEW_TYPES, INTERVIEW_STATUSES, STAFF_STATUSES,
} from "@/lib/constants";
import type { ApplicationStatus, InterviewStatus, PositionStatus, StaffStatus } from "@/lib/constants";

const opts = { timestamps: true } as const;
const ObjectId = Schema.Types.ObjectId;

// Typed by default now. Pass `any` explicitly if you want the old loose behavior.
function model<T>(name: string, schema: Schema): Model<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((mongoose.models[name] ?? mongoose.model(name, schema)) as any) as Model<T>;
}

/** File metadata only. The file itself lives in Cloudinary. */
const fileSchema = new Schema(
  {
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "raw"], required: true },
    fileName: { type: String, required: true },
    documentType: { type: String, required: true },
    format: String,
    bytes: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ---------- User ----------
export type Role = "CANDIDATE" | "ADMIN";
export interface UserFields {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
}
export type UserDoc = mongoose.HydratedDocument<UserFields>;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["CANDIDATE", "ADMIN"], default: "CANDIDATE" },
    isActive: { type: Boolean, default: true },
  },
  opts
);

export interface FileMeta {
  publicId: string;
  resourceType: "image" | "raw";
  fileName: string;
  documentType: string;
  format?: string;
  bytes?: number;
  uploadedAt?: Date;
}

export interface CandidateProfileFields {
  userId: mongoose.Types.ObjectId;
  profilePhoto?: FileMeta | null;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  skills?: string[];
  experience?: string;
  yearsOfExperience?: number;
  languages?: string[];
  availability?: string;
  emergencyContact?: { name?: string; phone?: string; relation?: string };
  documents: FileMeta[];
}
export type CandidateProfileDoc = mongoose.HydratedDocument<CandidateProfileFields>;

// ---------- CandidateProfile ----------
const profileSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, unique: true },
    profilePhoto: fileSchema,
    dateOfBirth: Date,
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER", ""], default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    skills: [String],
    experience: { type: String, default: "" },
    yearsOfExperience: { type: Number, default: 0 },
    languages: [String],
    availability: { type: String, default: "" },
    emergencyContact: { name: { type: String, default: "" }, phone: { type: String, default: "" }, relation: { type: String, default: "" } },
    documents: [fileSchema],
  },
  opts
);

// ---------- Position ----------
export interface PositionFields {
  title: string;
  slug: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  location: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  experienceRequired: string;
  compensation: string;
  openings: number;
  applicationDeadline?: Date | null;
  requiredDocuments: string[];
  status: PositionStatus;
}
export type PositionDoc = mongoose.HydratedDocument<PositionFields>;

const positionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    responsibilities: [String],
    requirements: [String],
    skills: [String],
    location: { type: String, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "FULL_TIME" },
    experienceRequired: { type: String, default: "" },
    compensation: { type: String, default: "" },
    openings: { type: Number, default: 1, min: 1 },
    applicationDeadline: Date,
    requiredDocuments: [String],
    status: { type: String, enum: POSITION_STATUSES, default: "ACTIVE", index: true },
  },
  opts
);

// ---------- Application ----------
export interface ApplicationFields {
  candidateId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  documents: FileMeta[];
  answers: { coverNote: string };
  agreement: { version: string; acceptedAt: Date; terms: string[] };
  adminNotes: string;
  statusHistory: { from?: string; to?: string; changedBy?: mongoose.Types.ObjectId; comment: string; at?: Date }[];
  appliedAt: Date;
}
export type ApplicationDoc = mongoose.HydratedDocument<ApplicationFields> & { positionId: PositionFields & { _id: Types.ObjectId } };

const applicationSchema = new Schema(
  {
    candidateId: { type: ObjectId, ref: "User", required: true, index: true },
    positionId: { type: ObjectId, ref: "Position", required: true, index: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: "NEW", index: true },
    documents: [fileSchema],
    answers: { coverNote: { type: String, default: "" } },
    agreement: {
      version: { type: String, required: true },
      acceptedAt: { type: Date, required: true },
      terms: [String],
    },
    adminNotes: { type: String, default: "" }, // never sent to candidates
    statusHistory: [
      {
        _id: false,
        from: String,
        to: String,
        changedBy: { type: ObjectId, ref: "User" },
        comment: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],
    appliedAt: { type: Date, default: Date.now },
  },
  opts
);
applicationSchema.index({ candidateId: 1, positionId: 1 }, { unique: true }); // one application per position
applicationSchema.index({ createdAt: -1 });

// ---------- Interview ----------
export interface InterviewFields {
  applicationId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  type: (typeof INTERVIEW_TYPES)[number];
  location: string;
  meetingLink: string;
  interviewer: string;
  instructions: string;
  status: InterviewStatus;
}
export type InterviewDoc = mongoose.HydratedDocument<InterviewFields>;

const interviewSchema = new Schema(
  {
    applicationId: { type: ObjectId, ref: "Application", required: true, index: true },
    candidateId: { type: ObjectId, ref: "User", required: true, index: true },
    positionId: { type: ObjectId, ref: "Position", required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    type: { type: String, enum: INTERVIEW_TYPES, required: true },
    location: { type: String, default: "" },
    meetingLink: { type: String, default: "" },
    interviewer: { type: String, default: "" },
    instructions: { type: String, default: "" },
    status: { type: String, enum: INTERVIEW_STATUSES, default: "SCHEDULED" },
  },
  opts
);

// ---------- Staff ----------
export interface StaffFields {
  candidateId: mongoose.Types.ObjectId;
  employeeId: string;
  joiningDate: Date;
  position: string;
  status: StaffStatus;
  documents: FileMeta[];
  joiningLetter: Record<string, unknown>;
  notes: string;
}
export type StaffDoc = mongoose.HydratedDocument<StaffFields>;

const joiningLetterSchema = new Schema(
  {
    version: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    employeeId: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    position: { type: String, required: true },
    location: { type: String, default: "" },
    compensation: { type: String, default: "" },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    candidatePhone: { type: String, default: "" },
    dateOfBirth: Date,
    address: { type: String, default: "" },
    photo: { type: fileSchema, required: true },
    signature: { type: fileSchema, required: true },
    terms: [String],
  },
  { _id: false }
);

const staffSchema = new Schema(
  {
    candidateId: { type: ObjectId, ref: "User", required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    joiningDate: { type: Date, required: true },
    position: { type: String, required: true },
    status: { type: String, enum: STAFF_STATUSES, default: "ACTIVE" },
    documents: [fileSchema],
    joiningLetter: { type: joiningLetterSchema, required: true },
    notes: { type: String, default: "" },
  },
  opts
);

// ---------- Notification ----------
export interface NotificationFields {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}
export type NotificationDoc = mongoose.HydratedDocument<NotificationFields>;

const notificationSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "INFO" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ---------- AuditLog ----------
const auditSchema = new Schema(
  {
    adminId: { type: ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: ObjectId },
    description: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = model<UserDoc>("User", userSchema);
export const CandidateProfile = model<CandidateProfileDoc>("CandidateProfile", profileSchema);
export const Position = model<PositionDoc>("Position", positionSchema);
export const Application = model<ApplicationDoc>("Application", applicationSchema);
export const Interview = model<InterviewDoc>("Interview", interviewSchema);
export const Staff = model<StaffDoc>("Staff", staffSchema);
export const Notification = model<NotificationDoc>("Notification", notificationSchema);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuditLog = model<any>("AuditLog", auditSchema);
