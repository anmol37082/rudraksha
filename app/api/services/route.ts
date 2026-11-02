import { NextRequest } from "next/server";
import { ApiError, handle, ok, parseBody, plain } from "@/lib/api";
import { Service } from "@/models";
import { serviceSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const GET = handle(async (req: NextRequest) => {
  await requireEventAdmin();
  const filter: Record<string, unknown> = {};
  const active = req.nextUrl.searchParams.get("active");
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;
  const items = await Service.find(filter).sort({ category: 1, name: 1 }).lean();
  return ok({ items: plain(items) });
});

export const POST = handle(async (req: NextRequest) => {
  const admin = await requireEventAdmin();
  const data = await parseBody(req, serviceSchema);
  if (await Service.exists({ name: { $regex: `^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } })) {
    throw new ApiError(409, "A service with this name already exists");
  }
  const service = await Service.create({ ...data, createdBy: admin._id });
  await audit(admin._id, "Service created", "Service", service._id, service.name);
  return ok(plain(service), "Service created", 201);
});
