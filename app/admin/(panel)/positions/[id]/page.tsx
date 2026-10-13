import { notFound } from "next/navigation";
import { findPosition } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { PositionForm } from "@/components/PositionForm";

export default async function EditPosition({ params }: { params: Promise<{ id: string }> }) {
  const p = await findPosition((await params).id);
  if (!p) notFound();
  return (<><PageTitle title="Edit position" /><PositionForm position={p} /></>);
}
