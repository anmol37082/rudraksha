import { NextRequest } from "next/server";
import { handle, ok, optionalAuth, pageParams, parseBody, plain, requireAuth } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";
import { listPublicPositions, slugify } from "@/lib/data";
import { positionSchema } from "@/lib/validators";
import { audit } from "@/lib/notify";
import { Position } from "@/models";

// Public: active positions only. Admin with ?all=1: every position (paginated).
export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const user = await optionalAuth();
  if (sp.get("all") && user?.role === "ADMIN") {
    const { page, limit, skip } = pageParams(sp);
    const [items, total] = await Promise.all([Position.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Position.countDocuments()]);
    return ok({ items: plain(items), total, page, limit });
  }
  return ok({ items: await listPublicPositions({ q: sp.get("q") ?? "", type: sp.get("type") ?? "" }) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAuth("ADMIN");
  const d = await parseBody(req, positionSchema);
  await connectDB();
  const slug = `${slugify(d.title)}-${Date.now().toString(36)}`;
  const p = await Position.create({ ...d, slug, applicationDeadline: d.applicationDeadline || undefined });
  await audit(admin._id, "Position created", "Position", p._id, p.title);
  return ok(plain(p), "Position created", 201);
});
