import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle, oid } from "@/lib/api";
import { Quotation } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
import { createQuotationPdf } from "@/lib/quotation-pdf";

export const GET = handle(async (_req: NextRequest, { params }) => {
  await requireEventAdmin();
  const id = oid((await params).id);
  const quote = await Quotation.findById(id).select("quotationNumber version snapshot").lean() as any;
  if (!quote) throw new ApiError(404, "Quotation not found");
  const bytes = createQuotationPdf({ ...quote.snapshot, quotationNumber: quote.quotationNumber, version: quote.version });
  const filename = `${String(quote.quotationNumber).replace(/[^A-Za-z0-9_-]/g, "_")}-v${quote.version}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
