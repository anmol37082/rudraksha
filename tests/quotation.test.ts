import { describe, expect, it } from "vitest";
import { quotationCreateSchema } from "@/lib/event-validators";
import { createQuotationPdf, quotationDocumentLines } from "@/lib/quotation-pdf";
import { calculateManpowerAmount } from "@/lib/quotation-service";
import { AGREEMENT_TEMPLATE, renderAgreementSections } from "@/lib/agreement-template";
import { createAgreementPdf } from "@/lib/agreement-pdf";
import { createFinancePdf, invoicePdfLines, paymentReceiptLines } from "@/lib/finance-pdf";

describe("quotation inputs and printable snapshot", () => {
  it("requires documented alternative milestones totaling 100% without RSVP", () => {
    const base = { eventId: "012345678901234567890123", additionalLines: [{ kind: "ADDITIONAL", description: "Coordination", quantity: 1, unit: "event", unitRate: 0 }], validUntil: "2026-12-01", rsvpIncluded: false };
    expect(quotationCreateSchema.safeParse(base).success).toBe(false);
    expect(quotationCreateSchema.safeParse({ ...base, alternativeMilestones: [{ name: "Deposit", percentage: 60, dueDescription: "On signing" }, { name: "Balance", percentage: 40, dueDescription: "Before event" }] }).success).toBe(true);
  });

  it("generates a valid PDF header and includes quotation snapshot fields", () => {
    const snapshot = { quotationNumber: "QT-TEST", version: 2, validUntil: "2026-12-01", client: { name: "Client" }, event: { eventName: "Event" }, lines: [{ description: "Service", quantity: 2, unit: "shift", unitRate: 100, amount: 200 }], currency: "INR", subtotal: 200, taxRate: 0, taxAmount: 0, discount: 0, grandTotal: 200, paymentMilestones: [], terms: [] };
    const pdf = createQuotationPdf(snapshot);
    expect(pdf.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(pdf.toString("ascii")).toContain("QT-TEST");
    expect(quotationDocumentLines(snapshot).some(line => line.text.includes("Service"))).toBe(true);
  });

  it("calculates manpower using the configured pricing unit", () => {
    expect(calculateManpowerAmount(3, 100, "PER_SHIFT")).toBe(300);
    expect(calculateManpowerAmount(3, 100, "PER_PERSON")).toBe(300);
    expect(calculateManpowerAmount(3, 100, "PER_EVENT")).toBe(100);
  });

  it("renders all 17 source agreement sections and a downloadable PDF", () => {
    const sections = renderAgreementSections({ eventName: "Sample event", clientName: "Sample client" });
    expect(AGREEMENT_TEMPLATE).toHaveLength(17);
    expect(sections).toHaveLength(17);
    expect(sections[1].content).toContain("Sample event");
    expect(sections[0].content).toContain("____________________________");
    expect(createAgreementPdf({ version: 1, status: "DRAFT", snapshot: { eventName: "Sample event", clientName: "Sample client" }, sections }).subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
  });

  it("creates finance invoice and payment receipt PDFs without callback argument errors", () => {
    const payment = { _id: "01234567890123456789abcd", paymentMethod: "BANK_TRANSFER", amount: 1250, currency: "INR", paymentDate: new Date("2026-10-31T00:00:00Z"), transactionReference: "TEST-REF", milestone: "Advance", notes: "Test-only" };
    const receipt = createFinancePdf("PAYMENT RECEIPT", paymentReceiptLines(payment));
    const invoice = createFinancePdf("INVOICE", invoicePdfLines({ invoiceNumber: "INV-TEST", status: "ISSUED", currency: "INR", subtotal: 1250, taxAmount: 0, grandTotal: 1250, amountReceived: 0, lines: [] }));
    expect(receipt.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(receipt.toString("ascii")).toContain("TEST-REF");
    expect(invoice.subarray(0, 8).toString("ascii")).toBe("%PDF-1.4");
    expect(invoice.toString("ascii")).toContain("INV-TEST");
  });
});
