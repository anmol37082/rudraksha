import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Service } from "@/models";
import { serviceSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const data = await parseBody(req, serviceSchema.partial());
  const service = await Service.findById(id);
  if (!service) throw new ApiError(404, "Service not found");
  if (data.name && await Service.exists({ _id: { $ne: id }, name: { $regex: `^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } })) {
    throw new ApiError(409, "A service with this name already exists");
  }
  Object.assign(service, data);
  await service.save();
  await audit(admin._id, "Service updated", "Service", service._id, Object.keys(data).join(", "));
  return ok(plain(service), "Service updated");
});
