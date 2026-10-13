import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Staff } from "@/models";
import { plain } from "@/lib/api";
import { EmptyState, PageTitle } from "@/components/ui";
import { JoiningLetter } from "@/components/JoiningLetter";

export default async function AdminStaffDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const staff = await Staff.findById(id).populate("candidateId", "name").lean();
  if (!staff) notFound();
  const record = plain(staff) as any;
  return <><PageTitle title={`Joining letter · ${record.employeeId}`} />{record.joiningLetter ? <JoiningLetter letter={record.joiningLetter} /> : <EmptyState title="No saved letter" text="This staff record was created before joining letters were enabled." />}</>;
}
