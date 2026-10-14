import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Application, CandidateProfile, Interview, Staff } from "@/models";
import { connectDB } from "@/lib/mongodb";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { STATUS_LABEL } from "@/lib/constants";
import { Badge, Card, PageTitle } from "@/components/ui";
import { AdminActions } from "@/components/AdminActions";
import { FileLink, fileUrl } from "@/components/FileLink";

export default async function AdminApplication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const raw = await Application.findById(id).populate("candidateId", "name email phone").populate("positionId", "title location").populate("statusHistory.changedBy", "name").lean();
  if (!raw) notFound();
  const app = plain(raw) as any;
  const [profile, interviews, staff] = await Promise.all([
    CandidateProfile.findOne({ userId: app.candidateId._id }).lean(), Interview.find({ applicationId: id }).sort({ date: -1 }).lean(), Staff.findOne({ candidateId: app.candidateId._id }).select("_id employeeId").lean(),
  ]);
  const p = plain(profile) as any;
  const ivs = plain(interviews) as any[];

  return (
    <section className="admin-application-detail">
      <PageTitle title={app.candidateId.name}><div className="admin-detail-title-tools"><Link className="admin-detail-back" href="/admin/applications"><span aria-hidden="true">←</span>Applications</Link><Badge status={app.status} /></div></PageTitle>
      <div className="admin-application-grid grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex gap-4">
              {p?.profilePhoto ? <img src={fileUrl(p.profilePhoto)} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="h-20 w-20 rounded-full bg-forest-100" />}
              <div className="min-w-0 text-sm">
                <p className="text-lg font-medium">{app.candidateId.name}</p>
                <p>{app.candidateId.email} · {app.candidateId.phone}</p>
                <p className="text-stone-600">{[p?.address, p?.city, p?.state, p?.country, p?.postalCode].filter(Boolean).join(", ") || "No address"}</p>
                <p className="mt-1"><Link className="text-forest-700 underline" href={`/admin/candidates/${app.candidateId._id}`}>Full candidate profile</Link></p>
              </div>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-stone-500">Experience</dt><dd>{p?.yearsOfExperience ?? 0} years. {p?.experience}</dd></div>
              <div><dt className="text-stone-500">Skills</dt><dd>{p?.skills?.join(", ") || "-"}</dd></div>
              <div><dt className="text-stone-500">Languages</dt><dd>{p?.languages?.join(", ") || "-"}</dd></div>
              <div><dt className="text-stone-500">Availability</dt><dd>{p?.availability || "-"}</dd></div>
              <div><dt className="text-stone-500">Emergency contact</dt><dd>{p?.emergencyContact?.name ? `${p.emergencyContact.name} (${p.emergencyContact.relation}) ${p.emergencyContact.phone}` : "-"}</dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="text-xl">Application</h2>
            <p className="mt-2 text-sm">{app.positionId?.title} · {app.positionId?.location} · applied {fmtDate(app.appliedAt)}</p>
            {app.answers?.coverNote && <p className="mt-2 whitespace-pre-line rounded-md bg-forest-50 p-3 text-sm">{app.answers.coverNote}</p>}
            <h3 className="mt-4 text-base">Documents</h3>
            <ul className="mt-1 space-y-1 text-sm">{app.documents?.length ? app.documents.map((d: any) => <li key={d.publicId}><FileLink f={d} /></li>) : <li className="text-stone-500">None</li>}</ul>
          </Card>
          <Card>
            <h2 className="text-xl">Application agreement</h2>
            {app.agreement ? <>
              <p className="mt-1 text-sm text-stone-600">Accepted {new Date(app.agreement.acceptedAt).toLocaleString("en-IN")} · version {app.agreement.version}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-700">{app.agreement.terms.map((term: string) => <li key={term}>{term}</li>)}</ol>
            </> : <p className="mt-1 text-sm text-stone-600">This application predates online agreement records.</p>}
          </Card>
          <Card>
            <h2 className="text-xl">Interviews</h2>
            {ivs.length ? ivs.map((i) => (
              <div key={i._id} className="mt-3 rounded-md bg-forest-50 p-3 text-sm">
                <div className="flex justify-between"><p className="font-medium">{fmtDate(i.date)} at {i.time} · {i.type.replace("_", " ").toLowerCase()}</p><Badge status={i.status} /></div>
                <p>{i.location || i.meetingLink || "-"}{i.interviewer && ` · ${i.interviewer}`}</p>
              </div>
            )) : <p className="mt-2 text-sm text-stone-600">None scheduled.</p>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card><h2 className="mb-3 text-xl">Actions</h2><AdminActions app={{ _id: app._id, status: app.status, adminNotes: app.adminNotes ?? "", hasStaff: !!staff }} /></Card>
          {staff && <Card><h2 className="text-xl">Staff record</h2><p className="mt-1 text-sm text-stone-600">Employee ID: {(staff as any).employeeId}</p><Link className="mt-2 inline-block text-sm text-forest-700 underline" href={`/admin/staff/${(staff as any)._id}`}>View saved joining letter</Link></Card>}
          <Card>
            <h2 className="mb-3 text-xl">History</h2>
            <ol className="space-y-3 text-sm">
              {[...app.statusHistory].reverse().map((h: any, i: number) => (
                <li key={i}><p><span className="font-medium">{h.from ? `${STATUS_LABEL[h.from]} → ` : ""}{STATUS_LABEL[h.to]}</span></p>
                  <p className="text-xs text-stone-500">{new Date(h.at).toLocaleString("en-IN")} · {h.changedBy?.name ?? "System"}</p>{h.comment && <p className="text-stone-700">{h.comment}</p>}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </section>
  );
}
