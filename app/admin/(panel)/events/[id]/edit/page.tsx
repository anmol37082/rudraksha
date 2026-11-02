import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Client, Event } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { EventForm } from "@/components/EventForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const event = await Event.findById(id).lean() as any;
  if (!event) notFound();
  const clients = plain(await Client.find({ $or: [{ status: { $ne: "ARCHIVED" } }, { _id: event.clientId }] }).sort({ name: 1 }).lean()) as any[];
  return <><PageTitle title="Edit event" /><EventForm clients={clients} event={plain(event)} /></>;
}
