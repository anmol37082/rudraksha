import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { Event,EventChangeRequest } from "@/models";
import { eventChangeCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const GET=handle(async(req:NextRequest)=>{await requireEventAdmin();const eventId=req.nextUrl.searchParams.get("eventId");if(!eventId)throw new ApiError(422,"eventId is required");const items=await EventChangeRequest.find({eventId:oid(eventId)}).sort({createdAt:-1}).populate("quotationId","quotationNumber version").populate("agreementId","version status").lean();return ok({items:plain(items)});});
export const POST=handle(async(req:NextRequest)=>{const admin=await requireEventAdmin();const data=await parseBody(req,eventChangeCreateSchema);const event=await Event.findById(oid(data.eventId));if(!event)throw new ApiError(404,"Event not found");if(["COMPLETED","CANCELLED","CLOSED"].includes(event.status))throw new ApiError(409,"Cannot request a change for a finalized event");const item=await EventChangeRequest.create({...data,eventId:event._id,requestedBy:admin._id,createdBy:admin._id});await audit(admin._id,"Event change requested","EventChangeRequest",item._id,data.description);return ok(plain(item),"Event change request created",201);});
