import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Event } from "@/models";
import { agreementSendSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin(); const id = oid((await params).id); const { reference } = await parseBody(req, agreementSendSchema);
  const agreement = await Agreement.findById(id); if (!agreement) throw new ApiError(404, "Agreement not found");
  if (agreement.status !== "DRAFT") throw new ApiError(409, "Only draft agreements can be marked as sent");
  agreement.status = "SENT"; agreement.snapshot = { ...agreement.snapshot, deliveryReference: reference, sentAt: new Date() }; await agreement.save();
  await audit(admin._id, "Agreement marked as sent", "Agreement", id, reference); return ok(plain(agreement), "Agreement sent reference recorded");
});
