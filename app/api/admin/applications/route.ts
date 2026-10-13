import { NextRequest } from "next/server";
import { handle, ok, pageParams, requireAuth } from "@/lib/api";
import { listApplications } from "@/lib/data";

export const GET = handle(async (req: NextRequest) => {
  await requireAuth("ADMIN");
  const sp = req.nextUrl.searchParams;
  const { page, limit } = pageParams(sp);
  const { items, total } = await listApplications(Object.fromEntries(sp), page, limit);
  return ok({ items, total, page, limit });
});
