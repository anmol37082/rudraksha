import Link from "next/link";
import { Event } from "@/models";
import { pageParams, plain } from "@/lib/api";
import { Badge, EmptyState, Input, LinkButton, PageTitle, Pagination, Table } from "@/components/ui";
import { fmtDate } from "@/lib/client";
import { EVENT_STATUSES } from "@/lib/event-constants";
import { connectDB } from "@/lib/mongodb";

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await connectDB();
  const sp = await searchParams;
  const { page, limit, skip } = pageParams(sp, 20);
  const filter: Record<string, unknown> = {};
  if (sp.q?.trim()) filter.eventName = new RegExp(sp.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (sp.status) filter.status = sp.status;
  const [rows, total] = await Promise.all([
    Event.find(filter).sort({ eventDate: -1 }).skip(skip).limit(limit).populate("clientId", "name businessName").lean(),
    Event.countDocuments(filter),
  ]);
  const events = plain(rows) as any[];
  return <>
    <PageTitle title="Events"><LinkButton href="/admin/events/new">Create event</LinkButton></PageTitle>
    <form className="mb-5 flex flex-wrap items-end gap-3" role="search"><label className="min-w-56 flex-1 text-xs text-stone-600">Search events<Input name="q" defaultValue={sp.q} placeholder="Event name" /></label>
      <label className="text-xs text-stone-600">Status<select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">All statuses</option>{EVENT_STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select></label>
      <button className="btn-outline" type="submit">Filter</button><Link className="btn-outline" href="/admin/events">Clear</Link>
    </form>
    {events.length ? <Table head={["Event", "Client / planner", "Dates", "City", "Guests", "Status", ""]}>{events.map((e) => <tr key={e._id}>
      <td className="td font-medium">{e.eventName}</td><td className="td">{e.clientId?.name ?? "—"}<p className="text-xs text-stone-500">{e.clientId?.businessName}</p></td>
      <td className="td">{fmtDate(e.eventDate)} – {fmtDate(e.eventEndDate)}</td><td className="td">{e.venues?.[0]?.city || "—"}</td><td className="td">{e.estimatedGuestCount}</td>
      <td className="td"><Badge status={e.status} /></td><td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/events/${e._id}`}>Open</Link></td>
    </tr>)}</Table> : <EmptyState title="No events found" text="Create an event under a client or planner record." action={<LinkButton href="/admin/events/new">Create event</LinkButton>} />}
    <Pagination page={page} total={total} limit={limit} path="/admin/events" params={{ q: sp.q, status: sp.status }} />
  </>;
}
