import Link from "next/link";
import { pageParams } from "@/lib/api";
import { listCandidates } from "@/lib/data";
import { fmtDate } from "@/lib/client";
import { Badge, Button, EmptyState, Input, PageTitle, Pagination, Table } from "@/components/ui";

export default async function AdminCandidates({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit } = pageParams(sp);
  const { items, total } = (await listCandidates(sp, page, limit)) as any;
  return (
    <>
      <PageTitle title="Candidates" />
      <form className="mb-5 flex gap-3" role="search">
        <Input name="q" defaultValue={sp.q} placeholder="Search name, phone or email" aria-label="Search candidates" className="!w-72" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {items.length ? (
        <Table head={["Name", "Contact", "City", "Joined", "Account", ""]}>
          {items.map((u: any) => (
            <tr key={u._id}><td className="td font-medium">{u.name}</td><td className="td"><p>{u.email}</p><p className="text-xs text-stone-500">{u.phone}</p></td><td className="td">{u.city || "-"}</td>
              <td className="td">{fmtDate(u.createdAt)}</td><td className="td"><Badge status={u.isActive ? "ACTIVE" : "INACTIVE"} /></td>
              <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/candidates/${u._id}`}>View</Link></td></tr>
          ))}
        </Table>
      ) : <EmptyState title="No candidates found" />}
      <Pagination page={page} total={total} limit={limit} path="/admin/candidates" params={{ q: sp.q }} />
    </>
  );
}
