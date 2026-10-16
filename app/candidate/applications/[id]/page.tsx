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
import styles from "./page.module.css";

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
      <div className={styles.pageHeader}><PageTitle title={app.positionId?.title}><Badge status={app.status} /></PageTitle></div>
      <div className={styles.layout}>
        <Card>
          <h2 className={styles.progressTitle}>Progress</h2>
          <StatusTimeline status={app.status} history={app.statusHistory} />
        </Card>
        <div className={styles.columnStack}>
          <Card>
            <h2 className={styles.sectionTitle}>Details</h2>
            <p className={styles.meta}>Applied on {fmtDate(app.appliedAt)} · {app.positionId?.location}</p>
            {app.answers?.coverNote && <p className={styles.coverNote}>{app.answers.coverNote}</p>}
            <p className={styles.documents}>Documents sent: {app.documents?.map((d: any) => DOCUMENT_LABEL[d.documentType]).join(", ") || "None"}</p>
            {app.agreement && <p className={styles.agreement}>Application agreement accepted {new Date(app.agreement.acceptedAt).toLocaleString("en-IN")} · version {app.agreement.version}</p>}
          </Card>
          <Card>
            <h2 className={styles.sectionTitle}>Interviews</h2>
            {interviews.length ? interviews.map((i) => (
              <div key={i._id} className={styles.interview}>
                <div className={styles.interviewHeading}><p className={styles.interviewDate}>{fmtDate(i.date)} at {i.time}</p><Badge status={i.status} /></div>
                <p className={styles.interviewLocation}>{i.type === "IN_PERSON" ? `In person: ${i.location}` : i.type === "VIDEO" ? "Video call" : "Phone call"}</p>
                {i.meetingLink && i.status === "SCHEDULED" && <a className={styles.meetingLink} href={i.meetingLink} target="_blank" rel="noopener noreferrer">Join link</a>}
                {i.interviewer && <p>Interviewer: {i.interviewer}</p>}
                {i.instructions && <p className="mt-1 text-stone-700">{i.instructions}</p>}
              </div>
            )) : <p className={styles.noInterview}>No interview yet.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
