import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/guard";
import { findPosition, isOpen } from "@/lib/data";
import { Application, CandidateProfile } from "@/models";
import { missingForApply } from "@/lib/profile";
import { DOCUMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { ApplyForm } from "@/components/ApplyForm";
import { documentsForApplication } from "@/lib/application-documents";

export default async function Apply({ params }: { params: Promise<{ positionId: string }> }) {
  const user = await requirePage("CANDIDATE");
  const position = await findPosition((await params).positionId);
  if (!position || position.status === "PAUSED") notFound();

  const existing = await Application.findOne({ candidateId: user._id, positionId: position._id }).select("_id").lean();
  const profile = await CandidateProfile.findOne({ userId: user._id }).lean();
  const missing = missingForApply(user, profile);
  const candidateDocuments = documentsForApplication(profile);
  const have = new Set(candidateDocuments.map((d) => d.documentType));
  const lacking: string[] = (position.requiredDocuments ?? []).filter((t: string) => !have.has(t));

  let blocker: React.ReactNode = null;
  if (!isOpen(position)) blocker = <p>Applications for this position are closed.</p>;
  else if (existing) blocker = <p>You have already applied for this position. <Link className="underline" href={`/candidate/applications/${existing._id}`}>View your application</Link>.</p>;
  else if (missing.length || lacking.length) {
    blocker = (
      <div className="space-y-2">
        <p>Before you apply, please complete these items on your profile:</p>
        <ul className="list-disc pl-5">
          {missing.map((m) => <li key={m}>{m}</li>)}
          {lacking.map((d) => <li key={d}>Upload: {DOCUMENT_LABEL[d]}</li>)}
        </ul>
        <LinkButton small href="/candidate/profile" className="mt-2">Go to my profile</LinkButton>
      </div>
    );
  }

  const summary: [string, string][] = [
    ["Name", user.name], ["Email", user.email], ["Phone", user.phone], ["City", profile?.city ?? ""],
    ["Experience", `${profile?.yearsOfExperience ?? 0} years`], ["Skills", (profile?.skills ?? []).join(", ")],
    ["Documents", candidateDocuments.map((d) => DOCUMENT_LABEL[d.documentType]).join(", ")], ["Apply by", position.applicationDeadline ? fmtDate(position.applicationDeadline) : "Open"],
  ];
  return (
    <>
      <PageTitle title={`Apply: ${position.title}`} />
      <div className="max-w-2xl">
        {blocker ? <Card className="text-sm text-stone-700">{blocker}</Card> : <ApplyForm positionId={String(position._id)} title={position.title} summary={summary} />}
      </div>
    </>
  );
}
