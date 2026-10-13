import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requirePage } from "@/lib/guard";
import { Application, Interview } from "@/models";
import { plain } from "@/lib/api";
import { forCandidate } from "@/lib/applications";
import { fmtDate } from "@/lib/client";
import { DOCUMENT_LABEL } from "@/lib/constants";
import { Badge, Card, PageTitle } from "@/components/ui";
import { StatusTimeline } from "@/components/StatusTimeline";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("CANDIDATE");
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  // Ownership enforced in the query itself.
  const raw = await Application.findOne({ _id: id, candidateId: user._id }).populate("positionId", "title location").lean();
  if (!raw) notFound();
  const app = forCandidate(plain(raw)) as any;
  const interviews = plain(await Interview.find({ applicationId: id }).sort({ date: -1 }).lean()) as any[];

  return (
    <>
      <PageTitle title={app.positionId?.title}><Badge status={app.status} /></PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <h2 className="mb-4 text-xl">Progress</h2>
          <StatusTimeline status={app.status} history={app.statusHistory} />
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl">Details</h2>
            <p className="mt-2 text-sm text-stone-700">Applied on {fmtDate(app.appliedAt)} · {app.positionId?.location}</p>
            {app.answers?.coverNote && <p className="mt-3 whitespace-pre-line text-sm text-stone-700">{app.answers.coverNote}</p>}
            <p className="mt-3 text-sm text-stone-600">Documents sent: {app.documents?.map((d: any) => DOCUMENT_LABEL[d.documentType]).join(", ") || "None"}</p>
            {app.agreement && <p className="mt-2 text-xs text-stone-500">Application agreement accepted {new Date(app.agreement.acceptedAt).toLocaleString("en-IN")} · version {app.agreement.version}</p>}
          </Card>
          <Card>
            <h2 className="text-xl">Interviews</h2>
            {interviews.length ? interviews.map((i) => (
              <div key={i._id} className="mt-3 rounded-md bg-forest-50 p-3 text-sm">
                <div className="flex items-center justify-between"><p className="font-medium">{fmtDate(i.date)} at {i.time}</p><Badge status={i.status} /></div>
                <p className="mt-1">{i.type === "IN_PERSON" ? `In person: ${i.location}` : i.type === "VIDEO" ? "Video call" : "Phone call"}</p>
                {i.meetingLink && i.status === "SCHEDULED" && <a className="text-forest-700 underline" href={i.meetingLink} target="_blank" rel="noopener noreferrer">Join link</a>}
                {i.interviewer && <p>Interviewer: {i.interviewer}</p>}
                {i.instructions && <p className="mt-1 text-stone-700">{i.instructions}</p>}
              </div>
            )) : <p className="mt-2 text-sm text-stone-600">No interview yet.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
