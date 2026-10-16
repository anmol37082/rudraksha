import Link from "next/link";
import { pageParams } from "@/lib/api";
import { listCandidates } from "@/lib/data";
import { fmtDate } from "@/lib/client";
import { Badge, Button, EmptyState, Input, PageTitle, Pagination, Table } from "@/components/ui";
import styles from "./page.module.css";

export default async function AdminCandidates({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit } = pageParams(sp);
  const { items, total } = (await listCandidates(sp, page, limit)) as any;
  return (
    <>
      <PageTitle title="Candidates" />
      <form className={styles.filterForm} role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Search name, phone or email" aria-label="Search candidates" className="!w-full sm:!w-72" />
        <Button type="submit" variant="outline" className="w-full sm:w-auto">Search</Button>
      </form>
      {items.length ? (
        <div className={styles.tableWrap}><Table head={["Name", "Contact", "City", "Joined", "Account", ""]}>
          {items.map((u: any) => (
            <tr key={u._id}><td className="td font-medium">{u.name}</td><td className="td"><p>{u.email}</p><p className="text-xs text-stone-500">{u.phone}</p></td><td className="td">{u.city || "-"}</td>
              <td className="td">{fmtDate(u.createdAt)}</td><td className="td"><Badge status={u.isActive ? "ACTIVE" : "INACTIVE"} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/candidates/${u._id}`}>View</Link></td></tr>
          ))}
        </Table></div>
      ) : <EmptyState title="No candidates found" />}
      <div className={styles.pagination}><Pagination page={page} total={total} limit={limit} path="/admin/candidates" params={{ q: sp.q }} /></div>
    </>
  );
}
