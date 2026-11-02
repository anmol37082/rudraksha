import { NextRequest,NextResponse } from "next/server";
import { ApiError,handle,oid } from "@/lib/api";
import { RoomAllocation } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
const csv=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
export const GET=handle(async(req:NextRequest)=>{await requireEventAdmin();const eventId=req.nextUrl.searchParams.get("eventId");if(!eventId)throw new ApiError(422,"eventId is required");const rows=await RoomAllocation.find({eventId:oid(eventId)}).populate("guestId","name contactNumber").populate("sharingWith","name").sort({checkInDate:1}).lean() as any[];const output=["guest,contact,hotel,room,category,shared with,check in,check out,status,notes",...rows.map(r=>[r.guestId?.name,r.guestId?.contactNumber,r.hotelName,r.roomNumber,r.roomCategory,r.sharingWith?.map((g:any)=>g.name).join("; "),r.checkInDate,r.checkOutDate,r.status,r.notes].map(csv).join(","))].join("\r\n");return new NextResponse(output,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=rooming-list.csv","Cache-Control":"private, no-store"}});});
