import Link from "next/link";
import { pageParams, plain } from "@/lib/api";
import { listApplications } from "@/lib/data";
import { connectDB } from "@/lib/mongodb";
import { Position } from "@/models";
import { APPLICATION_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, Button, EmptyState, Input, PageTitle, Pagination, Select, Table } from "@/components/ui";
import styles from "./page.module.css";

export default async function AdminApplications({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit } = pageParams(sp);
  const { items, total } = (await listApplications(sp, page, limit)) as any;
  await connectDB();
  const positions = plain(await Position.find().select("title").sort({ title: 1 }).lean()) as any[];
  return (
    <>
      <PageTitle title="Applications" />
      <form className={`${styles.filterForm} mb-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end`} role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Name, email or phone" aria-label="Search" className="sm:!w-56" />
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="sm:!w-48"><option value="">All statuses</option>{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
        <Select name="position" defaultValue={sp.position ?? ""} aria-label="Position" className="sm:!w-52"><option value="">All positions</option>{positions.map((p) => <option key={p._id} value={p._id}>{p.title}</option>)}</Select>
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <label className="block min-w-0 text-xs text-stone-600">From<Input name="from" type="date" defaultValue={sp.from} className="mt-1 sm:!w-40" /></label>
          <label className="block min-w-0 text-xs text-stone-600">To<Input name="to" type="date" defaultValue={sp.to} className="mt-1 sm:!w-40" /></label>
        </div>
        <div className="flex gap-3 sm:contents">
          <Button type="submit" variant="outline" className="flex-1 sm:flex-none">Filter</Button>
          <Link href="/admin/applications" className="flex min-h-11 flex-1 items-center justify-center text-sm text-stone-600 underline sm:flex-none">Clear</Link>
        </div>
      </form>
      {items.length ? (
        <div className={styles.tableWrap}><Table head={["Candidate", "Position", "Applied", "Status", ""]}>
          {items.map((a: any) => (
            <tr key={a._id}>
              <td className="td"><p className="font-medium">{a.candidateId?.name}</p><p className="text-xs text-stone-500">{a.candidateId?.phone}</p></td>
              <td className="td">{a.positionId?.title}</td><td className="td">{fmtDate(a.appliedAt)}</td><td className="td"><Badge status={a.status} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/applications/${a._id}`}>Review</Link></td>
            </tr>
          ))}
        </Table></div>
      ) : <div className={styles.emptyState}><EmptyState title="No applications match these filters" /></div>}
      <div className={styles.pagination}><Pagination page={page} total={total} limit={limit} path="/admin/applications" params={{ q: sp.q, status: sp.status, position: sp.position, from: sp.from, to: sp.to }} /></div>
    </>
  );
}
