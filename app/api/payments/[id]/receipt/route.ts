import { NextRequest,NextResponse } from "next/server";
import { ApiError,handle,oid } from "@/lib/api";
import { Payment } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
import { createFinancePdf,paymentReceiptLines } from "@/lib/finance-pdf";
export const GET=handle(async(_req:NextRequest,{params})=>{await requireEventAdmin();const id=oid((await params).id);const payment=await Payment.findById(id).populate("invoiceId","invoiceNumber").populate("clientId","name").populate("refundOf","transactionReference").lean() as any;if(!payment)throw new ApiError(404,"Payment record not found");const pdf=createFinancePdf(payment.paymentMethod==="REFUND"?"RUDRAKSHA EVENTS — REFUND RECEIPT":"RUDRAKSHA EVENTS — PAYMENT RECEIPT",paymentReceiptLines(payment));return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="receipt-${String(payment._id).slice(-8)}.pdf"`,"Cache-Control":"private, no-store"}});});
