import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { RateCard } from "@/models";
import { z } from "zod";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

const updateSchema = z.object({ isActive: z.literal(false).optional(), notes: z.string().trim().max(2000).optional() });

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const data = await parseBody(req, updateSchema);
  if (!Object.keys(data).length) throw new ApiError(422, "Choose a rate-card change");
  const rate = await RateCard.findById(id);
  if (!rate) throw new ApiError(404, "Rate card not found");
  if (data.isActive === false) { rate.isActive = false; rate.effectiveTo = new Date(Math.max(Date.now(), new Date(rate.effectiveFrom).getTime())); }
  if (data.notes !== undefined) rate.notes = data.notes;
  await rate.save();
  await audit(admin._id, "Rate card deactivated/annotated", "RateCard", id, Object.keys(data).join(", "));
  return ok(plain(rate), "Rate card updated");
});
