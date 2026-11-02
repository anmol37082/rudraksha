import { notFound } from "next/navigation";
import { Client, Event } from "@/models";
import mongoose from "mongoose";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { EventForm } from "@/components/EventForm";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ clientId?: string; duplicate?: string }> }) {
  const query = await searchParams;
  const filter: Record<string, unknown> = { status: { $ne: "ARCHIVED" } };
  if (query.clientId) {
    if (!mongoose.isValidObjectId(query.clientId)) notFound();
    filter._id = query.clientId;
  }
  const clients = plain(await Client.find(filter).sort({ name: 1 }).lean()) as any[];
  let source: any;
  if (query.duplicate) {
    const doc = await Event.findById(query.duplicate).lean();
    if (!doc) notFound();
    source = plain(doc);
  }
  const initial = source ? { ...source, eventName: `${source.eventName} (Copy)`, eventDate: null, eventEndDate: null, actualGuestCount: undefined, status: "DRAFT" } : undefined;
  return <><PageTitle title={source ? "Create event copy" : "Create event"} /><p className="mb-4 text-sm text-stone-600">New events start as drafts. Set event dates and venue before saving.</p><EventForm clients={clients} event={initial} duplicateId={source?._id} /></>;
}
