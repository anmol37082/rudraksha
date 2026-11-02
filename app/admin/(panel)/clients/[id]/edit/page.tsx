import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Client } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { ClientForm } from "@/components/ClientForm";
import { connectDB } from "@/lib/mongodb";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const client = await Client.findById(id).lean();
  if (!client) notFound();
  return <><PageTitle title="Edit client" /><ClientForm client={plain(client)} /></>;
}
