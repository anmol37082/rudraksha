import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { plain } from "@/lib/api";
import { Interview } from "@/models";
import { fmtDate } from "@/lib/client";
import { Badge, EmptyState, PageTitle, Table } from "@/components/ui";

export default async function AdminInterviews() {
  await connectDB();
  const items = plain(await Interview.find().sort({ date: -1 }).limit(100).populate("candidateId", "name").populate("positionId", "title").lean()) as any[];
  return (
    <>
      <PageTitle title="Interviews" />
      {items.length ? (
        <Table head={["Candidate", "Position", "When", "Type", "Status", ""]}>
          {items.map((i) => (
            <tr key={i._id}><td className="td font-medium">{i.candidateId?.name}</td><td className="td">{i.positionId?.title}</td><td className="td">{fmtDate(i.date)} {i.time}</td>
              <td className="td">{i.type.replace("_", " ").toLowerCase()}</td><td className="td"><Badge status={i.status} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/applications/${i.applicationId}`}>Application</Link></td></tr>
          ))}
        </Table>
      ) : <EmptyState title="No interviews yet" text="Shortlist a candidate, then schedule an interview from their application." />}
    </>
  );
}
