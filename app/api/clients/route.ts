import { NextRequest } from "next/server";
import { handle, ok, pageParams, parseBody, plain, escapeRegex } from "@/lib/api";
import { Client } from "@/models";
import { audit } from "@/lib/notify";
import { clientSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams, 20);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const filter: Record<string, unknown> = {};
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: re }, { businessName: re }, { contactPerson: re }, { email: re }, { phone: re }];
  }
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Client.countDocuments(filter),
  ]);
  return ok({ items: plain(items), total, page, limit });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, clientSchema);
  const client = await Client.create({ ...data, createdBy: admin._id });
  await audit(admin._id, "Client created", "Client", client._id, client.name);
  return ok(plain(client), "Client created", 201);
});
