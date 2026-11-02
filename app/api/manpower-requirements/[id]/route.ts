import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Event, ManpowerRequirement, Service } from "@/models";
import { manpowerRequirementSchema, requirementApprovalSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object") throw new ApiError(400, "Request body must be valid JSON");
  if ("approvalStatus" in input) {
    const decision = requirementApprovalSchema.parse(input);
    const requirement = await ManpowerRequirement.findById(id);
    if (!requirement) throw new ApiError(404, "Manpower requirement not found");
    if (decision.approvalStatus === "APPROVED") {
      const service = requirement.serviceId ? await Service.findById(requirement.serviceId).select("isRegulated") : null;
      const regulatedRole = /security|ps[o0]|bouncer|guard|gunman|medical|regulated/i.test(requirement.role);
      if ((service?.isRegulated || regulatedRole) && ![requirement.licenceReference, requirement.venuePermissionReference, requirement.writtenConfirmationReference].every((value: string) => value?.trim())) throw new ApiError(409, "Regulated work requires recorded licence, venue permission and written confirmation references before approval");
    }
    requirement.approvalStatus = decision.approvalStatus;
    requirement.approvedBy = admin._id;
    requirement.approvedAt = new Date();
    await requirement.save();
    await audit(admin._id, `Manpower requirement ${decision.approvalStatus.toLowerCase()}`, "ManpowerRequirement", id, decision.reason);
    return ok(plain(requirement), `Manpower requirement ${decision.approvalStatus.toLowerCase()}`);
  }
  const data = manpowerRequirementSchema.partial().omit({ eventId: true }).parse(input);
  const requirement = await ManpowerRequirement.findById(id);
  if (!requirement) throw new ApiError(404, "Manpower requirement not found");
  if (requirement.approvalStatus === "APPROVED") throw new ApiError(409, "An approved requirement cannot be edited. Add a revised requirement and reapprove it.");
  if (data.serviceId) {
    const service = await Service.findById(oid(data.serviceId)).select("isActive isRegulated");
    if (!service || !service.isActive) throw new ApiError(409, "This service is inactive");
  }
  Object.assign(requirement, data, data.eventDate ? { eventDate: new Date(data.eventDate) } : {});
  await requirement.save();
  await audit(admin._id, "Manpower requirement updated", "ManpowerRequirement", id, Object.keys(data).join(", "));
  return ok(plain(requirement), "Manpower requirement updated");
});

export const DELETE = handle(async (_req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const requirement = await ManpowerRequirement.findById(id);
  if (!requirement) throw new ApiError(404, "Manpower requirement not found");
  if (requirement.approvalStatus !== "PENDING") throw new ApiError(409, "Approved/rejected requirements are retained for history");
  await requirement.deleteOne();
  await audit(admin._id, "Manpower requirement removed", "ManpowerRequirement", id, requirement.role);
  return ok({}, "Manpower requirement removed");
});
