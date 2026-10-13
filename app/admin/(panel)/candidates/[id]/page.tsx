import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Application, CandidateProfile, Interview, User } from "@/models";
import { connectDB } from "@/lib/mongodb";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { profileCompletion } from "@/lib/profile";
import { Badge, Card, PageTitle } from "@/components/ui";
import { CandidateToggle } from "@/components/SmallActions";
import { FileLink, fileUrl } from "@/components/FileLink";

export default async function AdminCandidate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const user = await User.findOne({ _id: id, role: "CANDIDATE" }).lean();
  if (!user) notFound();
  const [profile, apps, ivs] = await Promise.all([
    CandidateProfile.findOne({ userId: id }).lean(),
    Application.find({ candidateId: id }).select("-adminNotes").populate("positionId", "title").sort({ createdAt: -1 }).lean(),
    Interview.find({ candidateId: id }).populate("positionId", "title").sort({ date: -1 }).lean(),
  ]);
  const p = plain(profile) as any;
  const applications = plain(apps) as any[];
  const interviews = plain(ivs) as any[];
  const { percent } = profileCompletion(user, profile);
  return (
    <>
      <PageTitle title={user.name}><CandidateToggle id={id} isActive={user.isActive} /></PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex gap-4">
            {p?.profilePhoto ? <img src={fileUrl(p.profilePhoto)} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="h-20 w-20 rounded-full bg-forest-100" />}
            <div className="text-sm"><p>{user.email}</p><p>{user.phone}</p><p className="text-stone-600">Profile {percent}% complete</p><Badge status={user.isActive ? "ACTIVE" : "INACTIVE"} /></div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-stone-500">Date of birth / gender</dt><dd>{fmtDate(p?.dateOfBirth)} · {p?.gender || "-"}</dd></div>
            <div><dt className="text-stone-500">Address</dt><dd>{[p?.address, p?.city, p?.state, p?.country, p?.postalCode].filter(Boolean).join(", ") || "-"}</dd></div>
            <div><dt className="text-stone-500">Skills</dt><dd>{p?.skills?.join(", ") || "-"}</dd></div>
            <div><dt className="text-stone-500">Experience</dt><dd>{p?.yearsOfExperience ?? 0} years. {p?.experience}</dd></div>
            <div><dt className="text-stone-500">Emergency contact</dt><dd>{p?.emergencyContact?.name ? `${p.emergencyContact.name} (${p.emergencyContact.relation}) ${p.emergencyContact.phone}` : "-"}</dd></div>
          </dl>
        </Card>
        <div className="space-y-6">
          <Card><h2 className="text-xl">Documents</h2><ul className="mt-2 space-y-1 text-sm">{p?.documents?.length ? p.documents.map((d: any) => <li key={d.publicId}><FileLink f={d} /></li>) : <li className="text-stone-500">None uploaded</li>}</ul></Card>
          <Card><h2 className="text-xl">Applications</h2><ul className="mt-2 space-y-2 text-sm">{applications.map((a) => <li key={a._id} className="flex items-center justify-between"><Link className="underline" href={`/admin/applications/${a._id}`}>{a.positionId?.title}</Link><Badge status={a.status} /></li>)}{!applications.length && <li className="text-stone-500">None</li>}</ul></Card>
          <Card><h2 className="text-xl">Interview history</h2><ul className="mt-2 space-y-2 text-sm">{interviews.map((i) => <li key={i._id} className="flex items-center justify-between"><span>{i.positionId?.title} · {fmtDate(i.date)} {i.time}</span><Badge status={i.status} /></li>)}{!interviews.length && <li className="text-stone-500">None</li>}</ul></Card>
        </div>
      </div>
    </>
  );
}
