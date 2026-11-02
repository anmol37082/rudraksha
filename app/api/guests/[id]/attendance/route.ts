import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Guest } from "@/models";
import { guestAttendanceSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const {checkInStatus}=await parseBody(req,guestAttendanceSchema);const guest=await Guest.findById(id);if(!guest)throw new ApiError(404,"Guest not found");if(checkInStatus==="CHECKED_OUT"&&guest.checkInStatus!=="CHECKED_IN")throw new ApiError(409,"Guest must be checked in before check-out");guest.checkInStatus=checkInStatus;await guest.save();await audit(admin._id,`Guest ${checkInStatus.toLowerCase()}`,"Guest",id,guest.name);return ok(plain(guest),"Guest attendance updated");});
