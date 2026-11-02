import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { RoomAllocation } from "@/models";
import { roomStatusSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,roomStatusSchema);const room=await RoomAllocation.findById(id);if(!room)throw new ApiError(404,"Room allocation not found");if(room.status==="CANCELLED"||room.status==="CHECKED_OUT")throw new ApiError(409,"This room allocation is final");if(data.status==="CHECKED_IN"&&room.status!=="ASSIGNED")throw new ApiError(409,"Only assigned rooms can be checked in");room.status=data.status;if(data.notes)room.notes=[room.notes,data.notes].filter(Boolean).join("\n");await room.save();await audit(admin._id,`Room allocation ${data.status.toLowerCase()}`,"RoomAllocation",id,data.notes);return ok(plain(room),`Room allocation ${data.status.toLowerCase()}`);});
