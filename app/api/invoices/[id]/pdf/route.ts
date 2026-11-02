import { NextRequest,NextResponse } from "next/server";
import { ApiError,handle,oid } from "@/lib/api";
import { Invoice } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
import { createFinancePdf,invoicePdfLines } from "@/lib/finance-pdf";
export const GET=handle(async(_req:NextRequest,{params})=>{await requireEventAdmin();const id=oid((await params).id);const invoice=await Invoice.findById(id).lean() as any;if(!invoice)throw new ApiError(404,"Invoice not found");const pdf=createFinancePdf("RUDRAKSHA EVENTS — INVOICE",invoicePdfLines(invoice));return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${invoice.invoiceNumber}.pdf"`,"Cache-Control":"private, no-store"}});});
