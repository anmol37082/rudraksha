import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { EventTask } from "@/models";
import { taskUpdateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
const transitions:Record<string,string[]>={PENDING:["IN_PROGRESS","COMPLETED","BLOCKED"],IN_PROGRESS:["PENDING","COMPLETED","BLOCKED"],BLOCKED:["IN_PROGRESS","COMPLETED"],COMPLETED:[]};
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,taskUpdateSchema);const task=await EventTask.findById(id);if(!task)throw new ApiError(404,"Task not found");if(!transitions[task.status]?.includes(data.status))throw new ApiError(409,`Cannot move task from ${task.status} to ${data.status}`);const from=task.status;task.status=data.status;if(data.notes)task.notes=[task.notes,data.notes].filter(Boolean).join("\n");await task.save();await audit(admin._id,`Event task ${data.status.toLowerCase()}`,"EventTask",id,`${from} -> ${data.status}; ${data.notes}`);return ok(plain(task),"Task updated");});
