import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { pageParams, plain } from "@/lib/api";
import { Application, Position } from "@/models";
import { EMPLOYMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, EmptyState, LinkButton, PageTitle, Pagination, Table } from "@/components/ui";
import { PositionRowActions } from "@/components/SmallActions";
import styles from "./page.module.css";

export default async function AdminPositions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit, skip } = pageParams(sp);
  await connectDB();
  const [items, total, counts] = await Promise.all([
    Position.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Position.countDocuments(),
    Application.aggregate([{ $group: { _id: "$positionId", n: { $sum: 1 } } }]),
  ]);
  const n = new Map<string, number>(counts.map((c: any) => [String(c._id), c.n]));
  const list = plain(items) as any[];
  return (
    <>
      <PageTitle title="Positions"><LinkButton className={styles.createAction} href="/admin/positions/new">New position</LinkButton></PageTitle>
      {list.length ? (
        <div className={styles.tableRegion}><Table head={["Position", "Type", "Deadline", "Applications", "Status", ""]}>
          {list.map((p) => (
            <tr key={p._id}>
              <td className="td"><div className={styles.positionInfo}><Link className="font-medium underline" href={`/admin/positions/${p._id}`}>{p.title}</Link><p className="text-xs text-stone-500">{p.location} · {p.openings} opening{p.openings > 1 ? "s" : ""}</p></div></td>
              <td className="td">{EMPLOYMENT_LABEL[p.employmentType]}</td><td className="td">{fmtDate(p.applicationDeadline)}</td><td className="td">{n.get(p._id) ?? 0}</td>
              <td className="td"><Badge status={p.status} /></td><td className="td"><PositionRowActions id={p._id} status={p.status} /></td>
            </tr>
          ))}
        </Table></div>
      ) : <EmptyState title="No positions yet" text="Create your first position so candidates can apply." action={<LinkButton className={styles.createAction} href="/admin/positions/new">New position</LinkButton>} />}
      <div className={styles.pagination}><Pagination page={page} total={total} limit={limit} path="/admin/positions" params={{}} /></div>
    </>
  );
}
