import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ZodError, ZodType } from "zod";
import { connectDB } from "./mongodb";
import { getSession, Role } from "./auth";
import { User } from "@/models";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const ok = (data: unknown = {}, message = "OK", status = 200) =>
  NextResponse.json({ success: true, message, data }, { status });

export const fail = (status: number, message: string, errors?: unknown) =>
  NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Wraps a route handler: consistent errors, no stack traces leaked. */
export function handle(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        const errors = Object.fromEntries(e.issues.map((i) => [i.path.join(".") || "form", i.message]));
        return fail(422, e.issues[0]?.message ?? "Invalid input", errors);
      }
      if ((e as { code?: number })?.code === 11000) return fail(409, "This record already exists");
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(json);
}

export function oid(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "Not found");
  return id;
}

/** Verifies cookie → JWT → live user record (active, role). Throws 401/403. */
export async function requireAuth(role?: Role) {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please log in to continue");
  await connectDB();
  const user = await User.findById(session.id);
  if (!user || !user.isActive) throw new ApiError(401, "Your account is not available");
  if (role && user.role !== role) throw new ApiError(403, "You do not have permission to do this");
  return user;
}

export async function optionalAuth() {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(session.id);
  return user && user.isActive ? user : null;
}

export function pageParams(sp: URLSearchParams | Record<string, string | string[] | undefined>, defLimit = 10) {
  const get = (k: string) => (sp instanceof URLSearchParams ? sp.get(k) : (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined))) ?? "";
  const page = Math.max(1, parseInt(get("page")) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(get("limit")) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Serializes a document for JSON responses (drops mongoose internals, converts Dates to ISO strings).
 * Returns `any` on purpose: callers pass mongoose lean docs whose runtime shape the JSON round-trip
 * erases; real types are enforced at the schema boundary (see CandidateProfileDoc in @/models).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const plain = (v: unknown): any => JSON.parse(JSON.stringify(v));
