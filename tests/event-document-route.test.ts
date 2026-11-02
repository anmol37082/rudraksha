import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api";

const state = vi.hoisted(() => ({ user: null as any, event: null as any, documents: [] as any[], document: null as any }));

vi.mock("@/lib/event-workflow", () => ({
  requireEventAdmin: vi.fn(async () => {
    if (state.user?.role !== "ADMIN") throw new ApiError(403, "Forbidden");
    return state.user;
  }),
}));
vi.mock("@/models", () => ({
  Event: {
    exists: vi.fn(async () => state.event ? { _id: state.event._id } : null),
    findById: vi.fn(() => ({ select: () => ({ lean: async () => state.event }) })),
  },
  EventDocument: {
    find: vi.fn(() => ({ select: () => ({ sort: () => ({ lean: async () => state.documents }) }) })),
    findOne: vi.fn(() => ({ sort() { return this; }, select() { return this; }, lean: async () => null, then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) { return Promise.resolve(state.document).then(resolve, reject); } })),
    create: vi.fn(async (value) => { const doc = { ...value, _id: String(value._id), createdAt: new Date() }; state.documents.unshift(doc); return doc; }),
  },
}));
vi.mock("@/lib/cloudinary", () => ({
  uploadPrivate: vi.fn(async (_bytes, options) => ({ public_id: options.publicId, bytes: 16 })),
  deletePrivate: vi.fn(async () => ({ result: "ok" })),
  validateFile: (bytes: Buffer, photo: boolean) => {
    if (!bytes.length) throw new ApiError(400, "The file is empty");
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new ApiError(422, "File must be a PDF, JPG, PNG or WEBP");
    return { ext: "pdf", mime: "application/pdf" };
  },
}));
vi.mock("@/lib/notify", () => ({ audit: vi.fn(async () => undefined) }));

import { GET, POST } from "@/app/api/events/[id]/documents/route";
import { DELETE } from "@/app/api/events/[id]/documents/[documentId]/route";

const eventId = "0123456789abcdef01234567";
const admin = { _id: "abcdef0123456789abcdef01", role: "ADMIN" };

function routeContext(id = eventId) { return { params: Promise.resolve({ id }) }; }
function uploadRequest(documentType = "Venue plan", bytes = "%PDF-1.4 synthetic test") {
  const form = new FormData();
  form.set("documentType", documentType);
  form.set("file", new File([bytes], "venue.pdf", { type: "application/pdf" }));
  return new NextRequest(`http://localhost/api/events/${eventId}/documents`, { method: "POST", body: form });
}

describe("event document routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = admin;
    state.event = { _id: eventId, status: "DRAFT" };
    state.documents = [];
    state.document = { _id: "222222222222222222222222", eventId, documentType: "Venue plan", version: 1, file: { publicId: `wedding-staff/events/${eventId}/documents/222222222222222222222222-12345678-1234-1234-1234-123456789abc`, resourceType: "raw" }, deleteOne: vi.fn(async () => undefined) };
  });

  it("lists documents only after ADMIN authorization", async () => {
    state.documents = [{ _id: "doc", documentType: "Venue plan", version: 1 }];
    const response = await GET(new NextRequest(`http://localhost/api/events/${eventId}/documents`), routeContext());
    expect(response.status).toBe(200);
    state.user = { role: "CANDIDATE" };
    const denied = await GET(new NextRequest(`http://localhost/api/events/${eventId}/documents`), routeContext());
    expect(denied.status).toBe(403);
  });

  it("stores a valid private PDF under an event-scoped versioned record", async () => {
    const response = await POST(uploadRequest(), routeContext());
    const result = await response.json();
    expect(response.status).toBe(201);
    expect(result.data.file.resourceType).toBe("raw");
    expect(result.data.file.publicId).toMatch(new RegExp(`^wedding-staff/events/${eventId}/documents/`));
    expect(result.data.version).toBe(1);
  });

  it("rejects invalid document bytes and cancelled or closed events before vendor upload", async () => {
    const invalid = await POST(uploadRequest("Venue plan", "not a document"), routeContext());
    expect(invalid.status).toBe(422);
    state.event = { ...state.event, status: "CLOSED" };
    const closed = await POST(uploadRequest(), routeContext());
    expect(closed.status).toBe(409);
    const cloudinary = await import("@/lib/cloudinary");
    expect(cloudinary.uploadPrivate).not.toHaveBeenCalled();
  });

  it("rejects malformed document types", async () => {
    const response = await POST(uploadRequest("../outside"), routeContext());
    expect(response.status).toBe(422);
  });

  it("removes a stored private file only before closure", async () => {
    const context = { params: Promise.resolve({ id: eventId, documentId: "222222222222222222222222" }) };
    const removed = await DELETE(new NextRequest(`http://localhost/api/events/${eventId}/documents/222222222222222222222222`, { method: "DELETE" }), context);
    expect(removed.status).toBe(200);
    expect(state.document.deleteOne).toHaveBeenCalledOnce();
    const cloudinary = await import("@/lib/cloudinary");
    expect(cloudinary.deletePrivate).toHaveBeenCalledOnce();

    state.event = { ...state.event, status: "CLOSED" };
    const closed = await DELETE(new NextRequest(`http://localhost/api/events/${eventId}/documents/222222222222222222222222`, { method: "DELETE" }), context);
    expect(closed.status).toBe(409);
    expect(cloudinary.deletePrivate).toHaveBeenCalledOnce();
  });
});
