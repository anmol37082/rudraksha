import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { assertEventTransition } from "@/lib/event-workflow";
import { clientSchema, eventCreateSchema, eventStatusSchema, guestSchema, rateCardSchema, transportSchema } from "@/lib/event-validators";
import { shiftsOverlap } from "@/lib/assignment-conflicts";
import { calculateOvertimeServiceCharge, overtimeHours } from "@/lib/shift-rules";

describe("event foundation validation", () => {
  it("requires distinct planner/client contact fields", () => {
    expect(clientSchema.safeParse({ name: "Planner", contactPerson: "Host", email: "host@example.com", phone: "+91 12345678" }).success).toBe(true);
    expect(clientSchema.safeParse({ name: "Planner", email: "invalid", phone: "123" }).success).toBe(false);
  });

  it("rejects an event whose end date precedes its start date", () => {
    const base = { clientId: "012345678901234567890123", eventName: "Wedding", eventDate: "2026-12-10", eventEndDate: "2026-12-09", venues: [{ name: "Venue" }] };
    expect(eventCreateSchema.safeParse(base).success).toBe(false);
    expect(eventCreateSchema.safeParse({ ...base, eventEndDate: "2026-12-11" }).success).toBe(true);
  });

  it("does not accept invented rates or invalid rate-card values", () => {
    const rate = { role: "Welcome Hostess", pricingUnit: "PER_SHIFT", rate: 2500, effectiveFrom: "2026-10-30" };
    expect(rateCardSchema.safeParse(rate).success).toBe(true);
    expect(rateCardSchema.safeParse({ ...rate, rate: -1 }).success).toBe(false);
  });

  it("requires an explicit admin reason to override confirmation gates", () => {
    const failed = () => assertEventTransition("ADVANCE_PENDING", "CONFIRMED", { approvedQuotation: false, signedAgreement: false, requiredAdvanceReceived: false });
    expect(failed).toThrow(ApiError);
    expect(() => assertEventTransition("ADVANCE_PENDING", "CONFIRMED", { approvedQuotation: false, signedAgreement: false, requiredAdvanceReceived: false, overrideReason: "Urgent approval" })).not.toThrow();
  });

  it("rejects invalid event status values", () => {
    expect(eventStatusSchema.safeParse({ status: "CONFIRMED" }).success).toBe(true);
    expect(eventStatusSchema.safeParse({ status: "READY" }).success).toBe(false);
  });

  it("detects overlapping shifts across midnight without rejecting adjacent shifts", () => {
    const date = new Date("2026-12-01T00:00:00.000Z");
    expect(shiftsOverlap({ date, start: "22:00", end: "02:00" }, { date: new Date("2026-12-02T00:00:00.000Z"), start: "01:00", end: "05:00" })).toBe(true);
    expect(shiftsOverlap({ date, start: "08:00", end: "12:00" }, { date, start: "12:00", end: "16:00" })).toBe(false);
  });

  it("validates guest stay dates and requires planner approval for assigned transport", () => {
    expect(guestSchema.safeParse({ eventId: "012345678901234567890123", name: "Guest", arrivalDate: "2026-12-10", departureDate: "2026-12-11" }).success).toBe(true);
    expect(guestSchema.safeParse({ eventId: "012345678901234567890123", name: "Guest", arrivalDate: "2026-12-11", departureDate: "2026-12-10" }).success).toBe(false);
    const transport = { eventId: "012345678901234567890123", guestIds: ["012345678901234567890124"], mode: "OTHER", status: "ASSIGNED" };
    expect(transportSchema.safeParse(transport).success).toBe(false);
    expect(transportSchema.safeParse({ ...transport, plannerApprovalReference: "planner email" }).success).toBe(true);
  });

  it("keeps overtime pending and applies only configured client service-charge blocks", () => {
    const rules = { firstExtensionHours: 4, firstExtensionMultiplier: 0.5, nextExtensionHours: 4, nextExtensionMultiplier: 0.5 };
    expect(overtimeHours(14, 12)).toBe(2);
    expect(calculateOvertimeServiceCharge(1000, 2, rules)).toBe(500);
    expect(calculateOvertimeServiceCharge(1000, 6, rules)).toBe(1000);
    expect(() => calculateOvertimeServiceCharge(1000, 9, rules)).toThrow();
  });
});
