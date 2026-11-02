import { describe, expect, it, vi } from "vitest";
import { privateDownloadOptions, PRIVATE_DOWNLOAD_TTL_SECONDS, signedUrl } from "@/lib/cloudinary";
import { ApiError, handle } from "@/lib/api";
import { assertPrivateFilePathAccess, candidateFileForPublicId, fileFormatAndResourceType, parsePrivateFilePath, receiptFileForPublicId } from "@/lib/private-file-access";
import { mongoConnectionOptions } from "@/lib/mongodb";
import { logSafeError, safeErrorSummary } from "@/lib/safe-logging";
import { isTransientSmtpError, sendWithTransientRetries } from "@/lib/email";
import { requireAdminSeedPassword } from "@/lib/admin-seed-password.mjs";
import { hasStrongJwtSecret } from "@/lib/security-config";
import { signToken } from "@/lib/auth";
import { hashRegistrationOtp } from "@/lib/verification";

const candidateId = "0123456789abcdef01234567";
const otherId = "abcdef0123456789abcdef01";
const expenseId = "111111111111111111111111";
const candidatePublicId = `wedding-staff/candidates/${candidateId}/documents/passport.pdf`;
const receiptPublicId = `wedding-staff/events/${otherId}/expenses/${expenseId}-12345678-1234-1234-1234-123456789abc`;

describe("private Cloudinary delivery", () => {
  it("builds a private download URL with an explicit bounded expiry", () => {
    const now = 1_800_000_000;
    const options = privateDownloadOptions("raw", now);
    expect(options).toEqual({ resource_type: "raw", type: "authenticated", expires_at: now + PRIVATE_DOWNLOAD_TTL_SECONDS, attachment: true });

    const build = vi.fn(() => "synthetic-url");
    expect(signedUrl(candidatePublicId, "raw", "pdf", now, build)).toBe("synthetic-url");
    expect(build).toHaveBeenCalledWith(candidatePublicId, "pdf", options);
  });

  it("accepts only valid candidate and event receipt IDs", () => {
    expect(parsePrivateFilePath(candidatePublicId)).toEqual({ kind: "candidate", candidateId });
    expect(parsePrivateFilePath(receiptPublicId)).toEqual({ kind: "receipt", eventId: otherId, expenseId });
    for (const invalid of ["", "https://example.invalid/file", "wedding-staff/candidates/short/documents/a.pdf", `${candidatePublicId}/../../private`, candidatePublicId.replaceAll("/", "\\")]) {
      expect(parsePrivateFilePath(invalid)).toBeNull();
    }
  });

  it("requires candidate ownership or ADMIN and limits receipts to ADMIN", () => {
    const candidatePath = parsePrivateFilePath(candidatePublicId)!;
    const receiptPath = parsePrivateFilePath(receiptPublicId)!;
    expect(() => assertPrivateFilePathAccess(candidatePath, "CANDIDATE", candidateId)).not.toThrow();
    expect(() => assertPrivateFilePathAccess(candidatePath, "ADMIN", otherId)).not.toThrow();
    expect(() => assertPrivateFilePathAccess(candidatePath, "CANDIDATE", otherId)).toThrowError(ApiError);
    expect(() => assertPrivateFilePathAccess(receiptPath, "ADMIN", otherId)).not.toThrow();
    expect(() => assertPrivateFilePathAccess(receiptPath, "CANDIDATE", otherId)).toThrowError(ApiError);
  });

  it("requires an exact stored metadata match and consistent resource type", () => {
    const profile = { profilePhoto: { publicId: "other", format: "jpg", resourceType: "image" }, documents: [{ publicId: candidatePublicId, format: "pdf", resourceType: "raw" }] };
    expect(candidateFileForPublicId(profile, candidatePublicId)?.publicId).toBe(candidatePublicId);
    expect(candidateFileForPublicId(profile, `${candidatePublicId}-other`)).toBeNull();
    const parsedPath = parsePrivateFilePath(receiptPublicId);
    if (!parsedPath || parsedPath.kind !== "receipt") throw new Error("Receipt fixture path was not parsed");
    const path = parsedPath;
    const expense = { _id: expenseId, eventId: otherId, receipt: { publicId: receiptPublicId, format: "jpg", resourceType: "image" } };
    expect(receiptFileForPublicId(expense, path, receiptPublicId)).toBe(expense.receipt);
    expect(receiptFileForPublicId({ ...expense, eventId: candidateId }, path, receiptPublicId)).toBeNull();
    expect(fileFormatAndResourceType({ format: "pdf", resourceType: "raw" })).toEqual({ format: "pdf", resourceType: "raw" });
    expect(fileFormatAndResourceType({ format: "pdf", resourceType: "image" })).toBeNull();
    expect(fileFormatAndResourceType({ format: "exe", resourceType: "raw" })).toBeNull();
  });
});

describe("production index policy", () => {
  it("disables automatic index creation only in production", () => {
    expect(mongoConnectionOptions("production")).toEqual({ bufferCommands: false, autoIndex: false });
    expect(mongoConnectionOptions("development")).toEqual({ bufferCommands: false, autoIndex: true });
    expect(mongoConnectionOptions("test")).toEqual({ bufferCommands: false, autoIndex: true });
  });
});

describe("shared JWT secret policy", () => {
  it("uses the same 32-character minimum for sessions and OTP protection", () => {
    expect(hasStrongJwtSecret("short-secret")).toBe(false);
    expect(hasStrongJwtSecret("synthetic-test-secret-with-at-least-32-chars")).toBe(true);
    vi.stubEnv("JWT_SECRET", "short-secret");
    expect(() => signToken({ id: "candidate-id", role: "CANDIDATE", name: "Synthetic" })).toThrow(/32\+ random characters/);
    expect(() => hashRegistrationOtp("synthetic@example.invalid", "000000")).toThrow(/32\+ characters/);
    vi.unstubAllEnvs();
  });
});

describe("safe error diagnostics", () => {
  it("keeps an allowlisted error code but omits message and stack content", () => {
    const error = Object.assign(new Error("password=secret otp=123456 https://private.example/signed"), { code: "ETIMEDOUT" });
    expect(safeErrorSummary(error)).toEqual({ errorType: "Error", code: "ETIMEDOUT" });
    expect(JSON.stringify(safeErrorSummary(error))).not.toMatch(/secret|123456|private\.example|password/);
  });

  it("does not preserve arbitrary vendor codes or non-Error values", () => {
    const error = Object.assign(new Error("smtp auth password"), { code: "pass=secret" });
    expect(safeErrorSummary(error)).toEqual({ errorType: "Error" });
    expect(safeErrorSummary({ message: "OTP 123456" })).toEqual({ errorType: "UnknownError" });
  });

  it("keeps API response generic and logs no raw exception details", async () => {
    const error = new Error("authorization=Bearer secret otp=123456 mail body and signed URL");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const req = { method: "POST", nextUrl: { pathname: "/api/test" } } as any;
    const response = await handle(async () => { throw error; })(req, { params: Promise.resolve({}) });
    const payload = await response.json();
    expect(response.status).toBe(500);
    expect(payload.message).toBe("Something went wrong. Please try again.");
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret|123456|signed URL|mail body/);
    log.mockRestore();
  });

  it("uses the same safe diagnostics for best-effort failures", async () => {
    const { bestEffort } = await import("@/lib/notify");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await bestEffort("test notification", async () => { throw new Error("password secret OTP 123456"); });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/password secret|123456/);
    log.mockRestore();
  });
});

describe("bounded SMTP retries", () => {
  it("retries transient errors within the fixed attempt bound", async () => {
    const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error("temporary"), { code: "ETIMEDOUT" })).mockResolvedValue("sent");
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(sendWithTransientRetries(send, wait)).resolves.toBe("sent");
    expect(send).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("does not retry permanent auth/configuration errors and stops after bounded transient attempts", async () => {
    expect(isTransientSmtpError(Object.assign(new Error("auth"), { code: "EAUTH" }))).toBe(false);
    expect(isTransientSmtpError(Object.assign(new Error("temporary auth"), { code: "EAUTH", responseCode: 454 }))).toBe(false);
    expect(isTransientSmtpError(Object.assign(new Error("temporary"), { responseCode: 451 }))).toBe(true);
    expect(isTransientSmtpError(Object.assign(new Error("permanent"), { responseCode: 550 }))).toBe(false);

    const permanent = vi.fn().mockRejectedValue(Object.assign(new Error("auth"), { code: "EAUTH" }));
    await expect(sendWithTransientRetries(permanent, vi.fn())).rejects.toThrow("auth");
    expect(permanent).toHaveBeenCalledTimes(1);

    const transient = vi.fn().mockRejectedValue(Object.assign(new Error("temporary"), { code: "ETIMEDOUT" }));
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(sendWithTransientRetries(transient, wait)).rejects.toThrow("temporary");
    expect(transient).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});

describe("admin seeding secret handling", () => {
  it("requires an environment-provided password without exposing it in errors", () => {
    expect(requireAdminSeedPassword("synthetic-seed-password")).toBe("synthetic-seed-password");
    expect(() => requireAdminSeedPassword(undefined)).toThrow(/ADMIN_SEED_PASSWORD/);
    expect(() => requireAdminSeedPassword("short")).toThrow(/at least 10 characters/);
  });
});
