import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { TransportSchedule } from "@/models";
import { transportStatusSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
const allowed:Record<string,string[]>={PLANNED:["APPROVAL_PENDING","APPROVED","CANCELLED"],APPROVAL_PENDING:["APPROVED","CANCELLED"],APPROVED:["ASSIGNED","CANCELLED"],ASSIGNED:["IN_PROGRESS","ISSUE_REPORTED","CANCELLED"],IN_PROGRESS:["COMPLETED","ISSUE_REPORTED","CANCELLED"],ISSUE_REPORTED:["ASSIGNED","IN_PROGRESS","CANCELLED"],COMPLETED:[],CANCELLED:[]};
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,transportStatusSchema);const item=await TransportSchedule.findById(id);if(!item)throw new ApiError(404,"Transport schedule not found");if(!allowed[item.status]?.includes(data.status))throw new ApiError(409,`Cannot change transport status from ${item.status} to ${data.status}`);if(["APPROVED","ASSIGNED","IN_PROGRESS","COMPLETED"].includes(data.status))item.plannerApprovalReference=data.plannerApprovalReference;if(data.issue)item.issue=data.issue;item.status=data.status;await item.save();await audit(admin._id,`Transport ${data.status.toLowerCase()}`,"TransportSchedule",id,data.issue||data.plannerApprovalReference);return ok(plain(item),`Transport marked ${data.status.toLowerCase()}`);});
