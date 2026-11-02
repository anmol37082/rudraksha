import Link from "next/link";
import { Client, Event } from "@/models";
import { pageParams, plain } from "@/lib/api";
import { Badge, EmptyState, Input, LinkButton, PageTitle, Pagination, Table } from "@/components/ui";
import { connectDB } from "@/lib/mongodb";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connectDB();
  const sp = await searchParams;
  const { page, limit, skip } = pageParams(sp, 20);
  const filter: Record<string, unknown> = {};
  if (sp.q?.trim()) {
    const escaped = sp.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "businessName", "contactPerson", "email", "phone"].map((field) => ({ [field]: new RegExp(escaped, "i") }));
  }
  if (sp.status) filter.status = sp.status;
  const [rows, total, eventCounts] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Client.countDocuments(filter),
    Event.aggregate([{ $group: { _id: "$clientId", count: { $sum: 1 } } }]),
  ]);
  const counts = new Map<string, number>(eventCounts.map((item: any) => [String(item._id), item.count]));
  const clients = plain(rows) as any[];
  return <>
    <PageTitle title="Clients"><LinkButton href="/admin/clients/new">Add client</LinkButton></PageTitle>
    <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
      <label className="min-w-56 flex-1 text-xs text-stone-600">Search clients<Input name="q" defaultValue={sp.q} placeholder="Name, business, email or phone" /></label>
      <label className="text-xs text-stone-600">Status<select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select></label>
      <button className="btn-outline" type="submit">Filter</button><Link className="btn-outline" href="/admin/clients">Clear</Link>
    </form>
    {clients.length ? <Table head={["Planner / business", "Contact", "Location", "Events", "Status", ""]}>{clients.map((c) => <tr key={c._id}>
      <td className="td"><p className="font-medium">{c.name}</p><p className="text-xs text-stone-500">{c.businessName || "—"}</p></td>
      <td className="td">{c.contactPerson}<p className="text-xs text-stone-500">{c.email} · {c.phone}</p></td>
      <td className="td">{[c.city, c.state, c.country].filter(Boolean).join(", ") || "—"}</td>
      <td className="td">{counts.get(c._id) ?? 0}</td><td className="td"><Badge status={c.status} /></td>
      <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/clients/${c._id}`}>Open</Link></td>
    </tr>)}</Table> : <EmptyState title="No clients found" text="Create a client record for an event planner before adding an event." action={<LinkButton href="/admin/clients/new">Add client</LinkButton>} />}
    <Pagination page={page} total={total} limit={limit} path="/admin/clients" params={{ q: sp.q, status: sp.status }} />
  </>;
}
