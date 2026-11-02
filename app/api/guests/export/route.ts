import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle, oid } from "@/lib/api";
import { Guest } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
const cell=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`;
export const GET=handle(async(req:NextRequest)=>{await requireEventAdmin();const eventId=req.nextUrl.searchParams.get("eventId");if(!eventId)throw new ApiError(422,"eventId is required");const guests=await Guest.find({eventId:oid(eventId)}).sort({name:1}).lean();const headers=["name","contactNumber","email","category","groupName","hostRelationship","arrivalDate","departureDate","travelMode","flightTrainDetails","roomRequired","specialRequests","dietaryRequirements","accessibilityNotes","rsvpStatus","checkInStatus","internalNotes"];const csv=[headers.join(","),...guests.map((guest:any)=>headers.map(key=>cell(guest[key] instanceof Date?guest[key].toISOString():guest[key])).join(","))].join("\r\n");return new NextResponse(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=event-guests.csv","Cache-Control":"private, no-store"}});});
