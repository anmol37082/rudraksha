import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ user: null as any, profile: null as any, expense: null as any, eventDocument: null as any }));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, requireAuth: vi.fn(async () => state.user) };
});

vi.mock("@/models", () => ({
  User: {},
  CandidateProfile: { findOne: vi.fn(() => ({ lean: async () => state.profile })) },
  Expense: { findOne: vi.fn(() => ({ lean: async () => state.expense })) },
  EventDocument: { findOne: vi.fn(() => ({ lean: async () => state.eventDocument })) },
}));

vi.mock("@/lib/cloudinary", () => ({ signedUrl: vi.fn(() => "https://delivery.invalid/synthetic") }));

import { GET } from "@/app/api/files/route";

const candidateId = "0123456789abcdef01234567";
const otherId = "abcdef0123456789abcdef01";
const expenseId = "111111111111111111111111";
const candidatePublicId = `wedding-staff/candidates/${candidateId}/documents/passport.pdf`;
const receiptPublicId = `wedding-staff/events/${otherId}/expenses/${expenseId}-12345678-1234-1234-1234-123456789abc`;
const documentId = "222222222222222222222222";
const eventDocumentPublicId = `wedding-staff/events/${otherId}/documents/${documentId}-12345678-1234-1234-1234-123456789abc`;

async function getFile(publicId: string) {
  const req = new NextRequest(`http://localhost/api/files?publicId=${encodeURIComponent(publicId)}`);
  return GET(req, { params: Promise.resolve({}) });
}

describe("private file API gateway", () => {
  beforeEach(() => {
    state.user = { _id: candidateId, role: "CANDIDATE" };
    state.profile = { profilePhoto: null, documents: [{ publicId: candidatePublicId, format: "pdf", resourceType: "raw" }] };
    state.expense = null;
    state.eventDocument = null;
  });

  it("returns a short-lived private download only for an exact owned candidate record", async () => {
    const response = await getFile(candidatePublicId);
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const cloudinary = await import("@/lib/cloudinary");
    expect(cloudinary.signedUrl).toHaveBeenCalledWith(candidatePublicId, "raw", "pdf");
  });

  it("denies other candidates and rejects guessed, stale, or malformed file IDs", async () => {
    state.user = { _id: otherId, role: "CANDIDATE" };
    expect((await getFile(candidatePublicId)).status).toBe(403);
    state.user = { _id: candidateId, role: "CANDIDATE" };
    expect((await getFile(candidatePublicId + "-guessed")).status).toBe(404);
    expect((await getFile("https://example.invalid/file")).status).toBe(404);
  });

  it("keeps event receipts ADMIN-only and requires the exact expense record", async () => {
    state.user = { _id: candidateId, role: "CANDIDATE" };
    expect((await getFile(receiptPublicId)).status).toBe(403);
    state.user = { _id: otherId, role: "ADMIN" };
    state.expense = { _id: expenseId, eventId: otherId, receipt: { publicId: receiptPublicId, format: "jpg", resourceType: "image" } };
    expect((await getFile(receiptPublicId)).status).toBe(302);
    state.expense = { ...state.expense, receipt: { ...state.expense.receipt, publicId: "different" } };
    expect((await getFile(receiptPublicId)).status).toBe(404);
  });

  it("keeps event documents ADMIN-only and requires the exact event document record", async () => {
    state.user = { _id: candidateId, role: "CANDIDATE" };
    expect((await getFile(eventDocumentPublicId)).status).toBe(403);
    state.user = { _id: otherId, role: "ADMIN" };
    state.eventDocument = { _id: documentId, eventId: otherId, file: { publicId: eventDocumentPublicId, format: "pdf", resourceType: "raw" } };
    const response = await getFile(eventDocumentPublicId);
    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    state.eventDocument = { ...state.eventDocument, file: { ...state.eventDocument.file, publicId: "different" } };
    expect((await getFile(eventDocumentPublicId)).status).toBe(404);
    expect((await getFile(`${eventDocumentPublicId}/..`)).status).toBe(404);
  });
});
