import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { Application } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { Badge, EmptyState, LinkButton, PageTitle, Table } from "@/components/ui";

export default async function Applications() {
  const user = await requirePage("CANDIDATE");
  const apps = plain(await Application.find({ candidateId: user._id }).sort({ createdAt: -1 }).select("status appliedAt positionId").populate("positionId", "title location").lean()) as any[];
  return (
    <>
      <PageTitle title="My applications" />
      {apps.length ? (
        <Table head={["Position", "Location", "Applied", "Status", ""]}>
          {apps.map((a) => (
            <tr key={a._id}><td className="td font-medium">{a.positionId?.title}</td><td className="td">{a.positionId?.location}</td><td className="td">{fmtDate(a.appliedAt)}</td>
              <td className="td"><Badge status={a.status} /></td><td className="td text-right"><Link className="text-forest-700 underline" href={`/candidate/applications/${a._id}`}>View</Link></td></tr>
          ))}
        </Table>
      ) : <EmptyState title="No applications yet" action={<LinkButton href="/jobs">View positions</LinkButton>} />}
    </>
  );
}
