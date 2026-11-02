import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Event } from "@/models";
import { agreementAcceptanceSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
import { renderAgreementSections } from "@/lib/agreement-template";
export const POST = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin(); const id = oid((await params).id); const data = await parseBody(req, agreementAcceptanceSchema);
  const agreement = await Agreement.findById(id); if (!agreement) throw new ApiError(404, "Agreement not found");
  if (!["SENT", "PARTIALLY_SIGNED"].includes(agreement.status)) throw new ApiError(409, "Agreement must be sent before recording acceptance");
  if (agreement.acceptanceRecords.some((record: any) => record.party === data.party)) throw new ApiError(409, `Acceptance from ${data.party.toLowerCase()} has already been recorded`);
  agreement.acceptanceRecords.push({ ...data, acceptedAt: new Date() } as any);
  const acceptedParties = new Set(agreement.acceptanceRecords.map((r: any) => r.party));
  const fullySigned = acceptedParties.has("CLIENT") && acceptedParties.has("PROVIDER");
  if (fullySigned && !agreement.snapshot?.rsvpIncluded && (!agreement.cancellationTermsInitialed || agreement.cancellationInitials.length < 2)) throw new ApiError(409, "Record and initial alternative cancellation terms by both parties before completing signatures when RSVP is excluded");
  let event: any;
  if (fullySigned) {
    event = await Event.findById(agreement.eventId);
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "AGREEMENT_PENDING") throw new ApiError(409, "Event status changed; reload the agreement before completing signatures");
  }
  const byParty = new Map(agreement.acceptanceRecords.map((r: any) => [r.party, r]));
  const clientRecord: any = byParty.get("CLIENT"); const providerRecord: any = byParty.get("PROVIDER");
  agreement.sections = renderAgreementSections({ ...agreement.snapshot, clientAcceptance: clientRecord?.reference ?? "", providerAcceptance: providerRecord?.reference ?? "", clientAcceptedAt: clientRecord?.acceptedAt?.toLocaleDateString("en-IN") ?? "", providerAcceptedAt: providerRecord?.acceptedAt?.toLocaleDateString("en-IN") ?? "" }) as any;
  agreement.status = fullySigned ? "SIGNED" : "PARTIALLY_SIGNED"; await agreement.save();
  if (fullySigned) { event.status = "AGREEMENT_SIGNED"; event.statusHistory.push({ from: "AGREEMENT_PENDING", to: "AGREEMENT_SIGNED", changedBy: admin._id, reason: "Both agreement parties accepted", at: new Date() }); await event.save(); }
  await audit(admin._id, `Agreement ${data.party.toLowerCase()} acceptance recorded`, "Agreement", id, `${data.acceptedBy}; ${data.method}; ${data.reference}`);
  return ok(plain(agreement), fullySigned ? "Agreement signed by both parties" : "Party acceptance recorded");
});
