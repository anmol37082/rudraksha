import Link from "next/link";
import { pageParams, plain } from "@/lib/api";
import { listApplications } from "@/lib/data";
import { connectDB } from "@/lib/mongodb";
import { Position } from "@/models";
import { APPLICATION_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, Button, EmptyState, Input, PageTitle, Pagination, Select, Table } from "@/components/ui";

export default async function AdminApplications({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit } = pageParams(sp);
  const { items, total } = (await listApplications(sp, page, limit)) as any;
  await connectDB();
  const positions = plain(await Position.find().select("title").sort({ title: 1 }).lean()) as any[];
  return (
    <>
      <PageTitle title="Applications" />
      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Name, email or phone" aria-label="Search" className="!w-56" />
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="!w-48"><option value="">All statuses</option>{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
        <Select name="position" defaultValue={sp.position ?? ""} aria-label="Position" className="!w-52"><option value="">All positions</option>{positions.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}</Select>
        <label className="text-xs text-stone-600">From<Input name="from" type="date" defaultValue={sp.from} className="!w-40" /></label>
        <label className="text-xs text-stone-600">To<Input name="to" type="date" defaultValue={sp.to} className="!w-40" /></label>
        <Button type="submit" variant="outline">Filter</Button>
        <Link href="/admin/applications" className="py-2.5 text-sm text-stone-600 underline">Clear</Link>
      </form>
      {items.length ? (
        <Table head={["Candidate", "Position", "Applied", "Status", ""]}>
          {items.map((a: any) => (
            <tr key={a._id}>
              <td className="td"><p className="font-medium">{a.candidateId?.name}</p><p className="text-xs text-stone-500">{a.candidateId?.phone}</p></td>
              <td className="td">{a.positionId?.title}</td><td className="td">{fmtDate(a.appliedAt)}</td><td className="td"><Badge status={a.status} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/applications/${a._id}`}>Review</Link></td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="No applications match these filters" />}
      <Pagination page={page} total={total} limit={limit} path="/admin/applications" params={{ q: sp.q, status: sp.status, position: sp.position, from: sp.from, to: sp.to }} />
    </>
  );
}
