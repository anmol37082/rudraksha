import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, pageParams, parseBody, plain } from "@/lib/api";
import { Quotation } from "@/models";
import { quotationCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
import { createQuotation } from "@/lib/quotation-service";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const { page, limit, skip } = pageParams(req.nextUrl.searchParams, 20);
  const eventId = req.nextUrl.searchParams.get("eventId");
  const filter: Record<string, unknown> = {};
  if (eventId) filter.eventId = oid(eventId);
  const [items, total] = await Promise.all([
    Quotation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("clientId", "name businessName").populate("eventId", "eventName eventDate").lean(),
    Quotation.countDocuments(filter),
  ]);
  return ok({ items: plain(items), total, page, limit });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, quotationCreateSchema);
  const quote = await createQuotation(admin._id, data);
  await audit(admin._id, "Quotation created", "Quotation", quote._id, `${quote.quotationNumber} v${quote.version}`);
  return ok(plain(quote), "Quotation draft created", 201);
});
