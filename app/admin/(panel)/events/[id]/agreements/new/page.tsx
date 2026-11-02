import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Event, Quotation } from "@/models";
import { PageTitle } from "@/components/ui";
import { AgreementBuilder } from "@/components/AgreementBuilder";
import { connectDB } from "@/lib/mongodb";
export default async function NewAgreementPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!mongoose.isValidObjectId(id)) notFound(); await connectDB(); const [eventRaw, quotes] = await Promise.all([Event.findById(id).populate("clientId").lean(), Quotation.find({ eventId: id, status: "APPROVED" }).sort({ version: -1 }).lean()]); const event = eventRaw as any; if (!event) notFound(); if (!quotes.length) return <><PageTitle title="Create agreement" /><p className="card">An approved event quotation is required first.</p></>; return <><PageTitle title={`Agreement · ${event.eventName}`} /><p className="mb-4 text-sm text-stone-600">The draft uses all 17 clauses from the supplied agreement. Missing company or bank details remain blank until an administrator enters verified values.</p><AgreementBuilder eventId={id} quotes={quotes as any[]} client={event.clientId} /></>; }
