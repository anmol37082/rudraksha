import { NextRequest } from "next/server";
import { ApiError, handle, ok, parseBody, plain } from "@/lib/api";
import { RateCard } from "@/models";
import { rateCardSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const filter: Record<string, unknown> = {};
  const role = req.nextUrl.searchParams.get("role")?.trim();
  if (role) filter.roleKey = role.toLowerCase();
  if (req.nextUrl.searchParams.get("active") === "true") filter.isActive = true;
  const items = await RateCard.find(filter).sort({ role: 1, version: -1 }).lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, rateCardSchema);
  const effectiveFrom = new Date(data.effectiveFrom);
  const effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : undefined;
  if (effectiveTo && effectiveTo < effectiveFrom) throw new ApiError(422, "Effective-to date cannot be before effective-from date");
  const roleKey = data.role.trim().toLowerCase();
  const latest = await RateCard.findOne({ roleKey }).sort({ version: -1 }).lean() as any;
  const current = await RateCard.findOne({ roleKey, isActive: true }).sort({ effectiveFrom: -1 }).lean() as any;
  if (current && effectiveFrom <= new Date(current.effectiveFrom)) throw new ApiError(409, "A new rate version must start after the current active version's effective date");
  const version = (latest?.version ?? 0) + 1;
  if (current) {
    current.isActive = false;
    current.effectiveTo = new Date(effectiveFrom.getTime() - 1);
    await RateCard.updateOne({ _id: current._id, version: current.version }, { $set: { isActive: false, effectiveTo: current.effectiveTo } });
  }
  const rateCard = await RateCard.create({ ...data, role: data.role.trim(), roleKey, currency: (data.currency ?? "INR").toUpperCase(), version, effectiveFrom, effectiveTo, createdBy: admin._id });
  await audit(admin._id, "Rate card version created", "RateCard", rateCard._id, `${rateCard.role} v${version} (${rateCard.pricingUnit})`);
  return ok(plain(rateCard), "Rate card version created", 201);
});
