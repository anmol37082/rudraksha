import { z } from "zod";
import {
  APPLICATION_STATUSES, POSITION_STATUSES, EMPLOYMENT_TYPES, INTERVIEW_TYPES, INTERVIEW_STATUSES, STAFF_STATUSES, DOCUMENT_TYPES, MANDATORY_POSITION_DOCUMENTS,
} from "./constants";

const phone = z.string().trim().regex(/^\+?[\d\s-]{7,18}$/, "Enter a valid phone number");
const list = z.array(z.string().trim().min(1)).max(30).default([]);
const optDate = z.string().trim().optional().refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone,
    password: z.string().min(8, "Password must be at least 8 characters").max(72).regex(/[A-Za-z]/, "Password needs a letter").regex(/\d/, "Password needs a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  adminOnly: z.boolean().optional(),
});

export const adminAccountSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(72),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(72).regex(/[A-Za-z]/, "Password needs a letter").regex(/\d/, "Password needs a number").optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => !!d.email || !!d.newPassword, { message: "Enter a new email or password" })
  .refine((d) => !d.newPassword || d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine((d) => !d.confirmPassword || !!d.newPassword, { path: ["newPassword"], message: "Enter a new password" });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.optional(),
  dateOfBirth: optDate,
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  skills: list.optional(),
  experience: z.string().trim().max(2000).optional(),
  yearsOfExperience: z.coerce.number().min(0).max(60).optional(),
  languages: list.optional(),
  availability: z.string().trim().max(200).optional(),
  emergencyContact: z
    .object({ name: z.string().trim().max(80), phone: z.string().trim().max(20), relation: z.string().trim().max(40) })
    .partial()
    .optional(),
});

export const positionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10, "Add a short description"),
  responsibilities: list,
  requirements: list,
  skills: list,
  location: z.string().trim().min(2),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceRequired: z.string().trim().max(100).default(""),
  compensation: z.string().trim().max(100).default(""),
  openings: z.coerce.number().int().min(1).max(500),
  applicationDeadline: optDate,
  requiredDocuments: z.array(z.enum(DOCUMENT_TYPES)).default([]).transform((docs) => [...new Set([...MANDATORY_POSITION_DOCUMENTS, ...docs])]),
  status: z.enum(POSITION_STATUSES),
});

export const applicationCreateSchema = z.object({
  positionId: z.string().min(1),
  answers: z.object({ coverNote: z.string().trim().max(1500).default("") }).default({ coverNote: "" }),
  confirm: z.literal(true, { errorMap: () => ({ message: "Please confirm that your information is correct" }) }),
  agreementAccepted: z.literal(true, { errorMap: () => ({ message: "Please accept the application agreement" }) }),
});

export const statusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  comment: z.string().trim().max(500).optional(),
  adminNotes: z.string().trim().max(3000).optional(),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM time");
export const interviewCreateSchema = z.object({
  applicationId: z.string().min(1),
  date: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid date"),
  time,
  type: z.enum(INTERVIEW_TYPES),
  location: z.string().trim().max(300).default(""),
  meetingLink: z.string().trim().url("Enter a valid link").or(z.literal("")).default(""),
  interviewer: z.string().trim().max(100).default(""),
  instructions: z.string().trim().max(1000).default(""),
});
export const interviewUpdateSchema = interviewCreateSchema.omit({ applicationId: true }).partial().extend({ status: z.enum(INTERVIEW_STATUSES).optional() });

export const staffCreateSchema = z.object({
  applicationId: z.string().min(1),
  joiningDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Choose a joining date"),
  notes: z.string().trim().max(1000).default(""),
});
export const staffUpdateSchema = z.object({ status: z.enum(STAFF_STATUSES).optional(), notes: z.string().trim().max(1000).optional() });

export const candidateAdminSchema = z.object({ isActive: z.boolean() });
