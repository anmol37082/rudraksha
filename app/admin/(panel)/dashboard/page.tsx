import Link from "next/link";
import { adminStats } from "@/lib/data";
import { fmtDate } from "@/lib/client";
import { Badge, Card, EmptyState, PageTitle, Table } from "@/components/ui";

export default async function AdminDashboard() {
  const { stats: s, recent, upcoming } = (await adminStats()) as any;
  const cards: [string, number][] = [["Candidates", s.candidates], ["New applications", s.newApps], ["Under review", s.review], ["Shortlisted", s.shortlisted], ["Interviews", s.interviews],
    ["Selected", s.selected], ["Rejected", s.rejected], ["Active positions", s.positions], ["Permanent staff", s.staff]];
  return (
    <>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map(([l, v]) => <Card key={l}><p className="font-serif text-3xl text-forest-900">{v}</p><p className="text-sm text-stone-600">{l}</p></Card>)}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl">Recent applications</h2>
          {recent.length ? (
            <Table head={["Candidate", "Position", "Status", ""]}>
              {recent.map((a: any) => (
                <tr key={a._id}><td className="td font-medium">{a.candidateId?.name}</td><td className="td">{a.positionId?.title}</td><td className="td"><Badge status={a.status} /></td>
                  <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/applications/${a._id}`}>Open</Link></td></tr>
              ))}
            </Table>
          ) : <EmptyState title="No applications yet" />}
        </section>
        <section>
          <h2 className="mb-3 text-xl">Upcoming interviews</h2>
          {upcoming.length ? (
            <Table head={["Candidate", "Position", "When"]}>
              {upcoming.map((i: any) => <tr key={i._id}><td className="td font-medium">{i.candidateId?.name}</td><td className="td">{i.positionId?.title}</td><td className="td">{fmtDate(i.date)} {i.time}</td></tr>)}
            </Table>
          ) : <EmptyState title="No upcoming interviews" />}
        </section>
      </div>
    </>
  );
}
