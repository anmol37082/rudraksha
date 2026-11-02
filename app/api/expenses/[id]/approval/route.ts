import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { Expense } from "@/models";
import { expenseDecisionSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,expenseDecisionSchema);const item=await Expense.findById(id);if(!item)throw new ApiError(404,"Expense not found");if(item.approvalStatus!=="PENDING")throw new ApiError(409,"Expense already has an approval decision");item.approvalStatus=data.approvalStatus;item.approvedBy=admin._id;await item.save();await audit(admin._id,`Event expense ${data.approvalStatus.toLowerCase()}`,"Expense",id,data.reason);return ok(plain(item),`Expense ${data.approvalStatus.toLowerCase()}`);});
