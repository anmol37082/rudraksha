import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Guest } from "@/models";
import { guestBaseSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT = handle(async (req: NextRequest,{params}) => { const admin = await requireEventAdmin(); const id = oid((await params).id); const data = await parseBody(req,guestBaseSchema.partial().omit({eventId:true})); const guest = await Guest.findById(id); if (!guest) throw new ApiError(404,"Guest not found"); Object.assign(guest,data,data.arrivalDate ? {arrivalDate:new Date(data.arrivalDate)} : {},data.departureDate ? {departureDate:new Date(data.departureDate)} : {}); await guest.save(); await audit(admin._id,"Event guest updated","Guest",id,Object.keys(data).join(", ")); return ok(plain(guest),"Guest updated"); });
