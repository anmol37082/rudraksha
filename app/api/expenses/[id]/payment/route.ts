import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { Expense } from "@/models";
import { expensePaymentSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,expensePaymentSchema);const item=await Expense.findById(id);if(!item)throw new ApiError(404,"Expense not found");if(item.approvalStatus!=="APPROVED")throw new ApiError(409,"Only approved expenses can be marked paid or reimbursed");item.paymentStatus=data.paymentStatus;if(data.reference)item.notes=[item.notes,`Expense payment evidence: ${data.reference}`].filter(Boolean).join("\n");await item.save();await audit(admin._id,`Expense marked ${data.paymentStatus.toLowerCase()}`,"Expense",id,data.reference);return ok(plain(item),"Expense payment status updated");});
