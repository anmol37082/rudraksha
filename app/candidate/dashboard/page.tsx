import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { Application, CandidateProfile, Interview } from "@/models";
import { plain } from "@/lib/api";
import { profileCompletion } from "@/lib/profile";
import { fmtDate } from "@/lib/client";
import { Badge, Card, EmptyState, LinkButton, PageTitle, Table } from "@/components/ui";

export default async function Dashboard() {
  const user = await requirePage("CANDIDATE");
  const [apps, profile, interview] = await Promise.all([
    Application.find({ candidateId: user._id }).sort({ createdAt: -1 }).select("status appliedAt positionId").populate("positionId", "title").lean(),
    CandidateProfile.findOne({ userId: user._id }).lean(),
    Interview.findOne({ candidateId: user._id, status: "SCHEDULED", date: { $gte: new Date(Date.now() - 86_400_000) } }).sort({ date: 1 }).populate("positionId", "title").lean(),
  ]);
  const n = (...s: string[]) => apps.filter((a) => s.includes(a.status)).length;
  const { percent, missing } = profileCompletion(user, profile);
  const cards: [string, number][] = [["Applications", apps.length], ["Under review", n("NEW", "UNDER_REVIEW")], ["Shortlisted", n("SHORTLISTED")], ["Interviews", n("INTERVIEW_SCHEDULED", "INTERVIEWED")], ["Selected", n("SELECTED")]];
  const list = plain(apps) as any[];
  const iv = plain(interview) as any;

  return (
    <>
      <PageTitle title={`Welcome, ${user.name.split(" ")[0]}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(([l, v]) => <Card key={l}><p className="font-serif text-3xl text-forest-900">{v}</p><p className="text-sm text-stone-600">{l}</p></Card>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl">Profile completion</h2>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-forest-600" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-sm text-stone-700">{percent}% complete{missing.length ? `. Still missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}` : "."}</p>
          {percent < 100 && <LinkButton small variant="outline" className="mt-3" href="/candidate/profile">Complete profile</LinkButton>}
        </Card>
        <Card>
          <h2 className="text-xl">Upcoming interview</h2>
          {iv ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div><dt className="inline text-stone-500">Position: </dt><dd className="inline font-medium">{iv.positionId?.title}</dd></div>
              <div><dt className="inline text-stone-500">When: </dt><dd className="inline font-medium">{fmtDate(iv.date)} at {iv.time}</dd></div>
              <div><dt className="inline text-stone-500">Where: </dt><dd className="inline font-medium">{iv.type === "IN_PERSON" ? iv.location : iv.type === "VIDEO" ? "Video call" : "Phone call"}</dd></div>
            </dl>
          ) : <p className="mt-3 text-sm text-stone-600">No interview scheduled yet.</p>}
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-xl">My applications</h2>
      {list.length ? (
        <Table head={["Position", "Applied", "Status", ""]}>
          {list.slice(0, 5).map((a) => (
            <tr key={a._id}><td className="td font-medium">{a.positionId?.title}</td><td className="td">{fmtDate(a.appliedAt)}</td><td className="td"><Badge status={a.status} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/candidate/applications/${a._id}`}>View</Link></td></tr>
          ))}
        </Table>
      ) : <EmptyState title="You have not applied yet" text="Browse the open positions and apply to the one that suits you." action={<LinkButton href="/jobs">View positions</LinkButton>} />}
    </>
  );
}
