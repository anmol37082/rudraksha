import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Guest, Quotation, RSVP } from "@/models";
import { rsvpSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const POST = handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,rsvpSchema);const guest=await Guest.findById(id);if(!guest)throw new ApiError(404,"Guest not found");if(!await Quotation.exists({eventId:guest.eventId,status:"APPROVED",rsvpIncluded:true}))throw new ApiError(409,"RSVP is optional and can only be managed when included in an approved quotation");const rsvp=await RSVP.create({eventId:guest.eventId,guestId:guest._id,status:data.status,travelDetails:data.travelDetails,evidence:data.evidence,recordedBy:admin._id});guest.rsvpStatus=data.status;await guest.save();await audit(admin._id,"Guest RSVP recorded","RSVP",rsvp._id,`${guest.name}: ${data.status}; ${data.evidence}`);return ok(plain(rsvp),"RSVP response recorded",201);});
