import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { Event,EventTask,User } from "@/models";
import { taskCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const GET=handle(async(req:NextRequest)=>{await requireEventAdmin();const eventId=req.nextUrl.searchParams.get("eventId");if(!eventId)throw new ApiError(422,"eventId is required");const items=await EventTask.find({eventId:oid(eventId)}).sort({dueAt:1,createdAt:1}).populate("assignedTo","name email").lean();return ok({items:plain(items)});});
export const POST=handle(async(req:NextRequest)=>{const admin=await requireEventAdmin();const data=await parseBody(req,taskCreateSchema);const event=await Event.findById(oid(data.eventId));if(!event)throw new ApiError(404,"Event not found");if(["CANCELLED","CLOSED"].includes(event.status))throw new ApiError(409,"Cannot add tasks to a cancelled or closed event");if(data.assignedTo){const assignee=await User.findById(oid(data.assignedTo)).select("role");if(!assignee||assignee.role!=="ADMIN")throw new ApiError(422,"Tasks can only be assigned to an authorized admin");}const task=await EventTask.create({...data,eventId:event._id,dueAt:data.dueAt?new Date(data.dueAt):undefined,assignedTo:data.assignedTo?oid(data.assignedTo):undefined,createdBy:admin._id});await audit(admin._id,"Event task created","EventTask",task._id,task.title);return ok(plain(task),"Event task created",201);});
