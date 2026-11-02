import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { ApiError,handle,ok,oid,plain } from "@/lib/api";
import { Expense } from "@/models";
import { deletePrivate,uploadPrivate,validateFile } from "@/lib/cloudinary";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
export const POST=handle(async(req:NextRequest,{params})=>{const admin=await requireEventAdmin();const id=oid((await params).id);const item=await Expense.findById(id);if(!item)throw new ApiError(404,"Expense not found");const form=await req.formData();const file=form.get("file");if(!(file instanceof File))throw new ApiError(422,"Select a receipt file");const bytes=Buffer.from(await file.arrayBuffer());const detected=validateFile(bytes,false);const resourceType=detected.ext==="pdf"?"raw":"image";const publicId=`wedding-staff/events/${item.eventId}/expenses/${item._id}-${randomUUID()}`;const uploaded=await uploadPrivate(bytes,{publicId,resourceType});const previous=item.receipt as any;item.receipt={publicId:uploaded.public_id,resourceType,format:detected.ext,bytes:uploaded.bytes,originalName:file.name.slice(0,180),uploadedAt:new Date()};await item.save();if(previous?.publicId)await deletePrivate(previous.publicId,previous.resourceType==="raw"?"raw":"image");await audit(admin._id,"Expense receipt uploaded","Expense",id,`${file.name} · ${uploaded.bytes} bytes`);return ok(plain(item),"Private receipt uploaded");});
