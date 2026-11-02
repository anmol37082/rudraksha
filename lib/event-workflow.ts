import { ApiError, requireAuth } from "@/lib/api";
import { EVENT_TRANSITIONS, type EventStatus } from "@/lib/event-constants";
export { EVENT_STATUSES, EVENT_TRANSITIONS, type EventStatus } from "@/lib/event-constants";

export type ConfirmationChecks = {
  approvedQuotation: boolean;
  signedAgreement: boolean;
  requiredAdvanceReceived: boolean;
  overrideReason?: string;
};

export function assertEventTransition(from: EventStatus, to: EventStatus, checks: ConfirmationChecks = {
  approvedQuotation: false, signedAgreement: false, requiredAdvanceReceived: false,
}) {
  if (!EVENT_TRANSITIONS[from]?.includes(to)) throw new ApiError(409, `Cannot change event status from ${from} to ${to}`);
  if (to === "CONFIRMED" && checks) {
    const missing: string[] = [];
    if (!checks.approvedQuotation) missing.push("approved quotation");
    if (!checks.signedAgreement) missing.push("signed agreement");
    if (!checks.requiredAdvanceReceived) missing.push("required advance payment");
    if (missing.length && !checks.overrideReason?.trim()) {
      throw new ApiError(409, `Event confirmation requires ${missing.join(", ")}. An authorized admin override must include a reason.`);
    }
  }
}

/**
 * New event-system endpoints call this helper in addition to validating entity ownership.
 * Recruitment candidates deliberately have no event-system access.
 */
export async function requireEventAdmin() {
  return requireAuth("ADMIN");
}
