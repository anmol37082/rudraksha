import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,parseBody,plain } from "@/lib/api";
import { Expense } from "@/models";
import { expenseUpdateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const PUT=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const data=await parseBody(req,expenseUpdateSchema);const item=await Expense.findById(id);if(!item)throw new ApiError(404,"Expense not found");if(item.approvalStatus!=="PENDING")throw new ApiError(409,"Only pending expenses can be edited; approved or rejected records remain in the audit history");Object.assign(item,data,data.date?{date:new Date(data.date)}:{},data.currency?{currency:data.currency.toUpperCase()}:{});await item.save();await audit(admin._id,"Event expense edited","Expense",id,Object.keys(data).join(", "));return ok(plain(item),"Expense updated");});
