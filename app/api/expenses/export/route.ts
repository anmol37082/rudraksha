import { NextRequest,NextResponse } from "next/server";
import { ApiError,handle,oid } from "@/lib/api";
import { Expense } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
const cell=(v:unknown)=>`"${String(v??"").replace(/"/g,'""')}"`;
export const GET=handle(async(req:NextRequest)=>{await requireEventAdmin();const eventId=req.nextUrl.searchParams.get("eventId");if(!eventId)throw new ApiError(422,"eventId is required");const rows=await Expense.find({eventId:oid(eventId)}).sort({date:-1}).lean() as any[];const csv=["category,description,amount,currency,date,vendor,approvalStatus,paymentStatus,notes",...rows.map(x=>[x.category,x.description,x.amount,x.currency,x.date,x.vendor,x.approvalStatus,x.paymentStatus,x.notes].map(cell).join(","))].join("\r\n");return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=event-expenses.csv","Cache-Control":"private, no-store"}});});
