import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Agreement, Event, EventStaffAssignment, ManpowerRequirement, Quotation, Service, Staff, User } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { Badge, Card, EmptyState, LinkButton, PageTitle } from "@/components/ui";
import { EventStatusForm } from "@/components/EventStatusForm";
import { ManpowerManager } from "@/components/ManpowerManager";
import { AssignmentManager } from "@/components/AssignmentManager";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const [doc, requirementsRaw, servicesRaw, quotesRaw, agreementsRaw, assignmentsRaw, staffRaw] = await Promise.all([
    Event.findById(id).populate("clientId", "name businessName contactPerson email phone").lean(),
    ManpowerRequirement.find({ eventId: id }).sort({ eventDate: 1 }).populate("serviceId", "name isRegulated").lean(),
    Service.find({ isActive: true }).sort({ name: 1 }).lean(),
    Quotation.find({ eventId: id }).sort({ version: -1 }).select("quotationNumber version status grandTotal currency createdAt").lean(),
    Agreement.find({ eventId: id }).sort({ version: -1 }).select("version status createdAt").lean(),
    EventStaffAssignment.find({ eventId: id }).sort({ eventDate: 1 }).populate({ path: "staffId", select: "employeeId position status candidateId", populate: { path: "candidateId", model: User, select: "name" } }).populate("requirementId", "role requiredQuantity").lean(),
    Staff.find({ status: "ACTIVE" }).sort({ employeeId: 1 }).populate("candidateId", "name").lean(),
  ]);
  if (!doc) notFound();
  const event = plain(doc) as any;
  const requirements = plain(requirementsRaw) as any[];
  const services = plain(servicesRaw) as any[];
  const quotes = plain(quotesRaw) as any[];
  const agreements = plain(agreementsRaw) as any[];
  const assignments = plain(assignmentsRaw) as any[];
  const staff = plain(staffRaw) as any[];
  return <>
    <PageTitle title={event.eventName}><div className="flex flex-wrap gap-2"><LinkButton variant="outline" href={`/admin/events/${id}/operations`}>Operations</LinkButton><LinkButton variant="outline" href={`/admin/events/${id}/guests`}>Guests & Logistics</LinkButton><LinkButton variant="outline" href={`/admin/events/${id}/finance`}>Finance</LinkButton><LinkButton variant="outline" href={`/admin/events/${id}/closure`}>Closure review</LinkButton><LinkButton variant="outline" href={`/admin/events/new?duplicate=${id}`}>Duplicate</LinkButton><LinkButton href={`/admin/events/${id}/edit`}>Edit event</LinkButton></div></PageTitle>
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Card className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs uppercase text-stone-500">Status</p><Badge status={event.status} /></div>
          <div><p className="text-xs uppercase text-stone-500">Client / planner</p><Link className="text-forest-700 underline" href={`/admin/clients/${event.clientId?._id}`}>{event.clientId?.name ?? "Unknown client"}</Link><p className="text-xs text-stone-500">{event.clientId?.businessName}</p></div>
          <div><p className="text-xs uppercase text-stone-500">Couple / host</p><p>{event.coupleOrHostName || "—"}</p></div>
          <div><p className="text-xs uppercase text-stone-500">Event type</p><p>{event.eventType || "—"}</p></div>
          <div><p className="text-xs uppercase text-stone-500">Dates / days</p><p>{fmtDate(event.eventDate)} – {fmtDate(event.eventEndDate)} · {event.numberOfEventDays} day(s)</p></div>
          <div><p className="text-xs uppercase text-stone-500">Guest count</p><p>{event.actualGuestCount ?? "Not recorded"} actual / {event.estimatedGuestCount} estimated</p></div>
          <div className="sm:col-span-2"><p className="text-xs uppercase text-stone-500">Venues</p>{event.venues?.length ? event.venues.map((v: any, i: number) => <p key={i}>{v.name} · {[v.address, v.city, v.state].filter(Boolean).join(", ")}</p>) : <p>—</p>}</div>
          {event.description && <div className="sm:col-span-2"><p className="text-xs uppercase text-stone-500">Description</p><p className="whitespace-pre-wrap">{event.description}</p></div>}
          {event.internalNotes && <div className="sm:col-span-2"><p className="text-xs uppercase text-stone-500">Internal notes</p><p className="whitespace-pre-wrap">{event.internalNotes}</p></div>}
        </Card>
        <section><h2 className="mb-3 font-serif text-xl">Event timeline</h2>{event.statusHistory?.length ? <ol className="space-y-3">{[...event.statusHistory].reverse().map((h: any, i: number) => <li className="rounded-xl border border-forest-100 bg-white p-4" key={`${h.at}-${i}`}><p className="font-medium">{h.from ? `${h.from.replaceAll("_", " ")} → ` : ""}{h.to.replaceAll("_", " ")}</p><p className="text-xs text-stone-500">{fmtDate(h.at)} {h.reason ? `· ${h.reason}` : ""}</p></li>)}</ol> : <EmptyState title="No status changes recorded" text="The event is currently in its initial draft state." />}</section>
        <section id="manpower"><h2 className="mb-3 font-serif text-xl">Staffing requirements</h2><ManpowerManager eventId={id} initial={requirements} services={services} /></section>
        <section id="deployment"><div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-xl">Existing staff deployment</h2><LinkButton variant="outline" href={`/admin/events/${id}/deployment`}>Deployment sheet</LinkButton></div><AssignmentManager eventId={id} eventStatus={event.status} requirements={requirements} staff={staff} initial={assignments} /></section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-xl">Quotations</h2><LinkButton href={`/admin/events/${id}/quotations/new`}>Create quotation</LinkButton></div>{quotes.length ? <div className="space-y-2">{quotes.map((q: any) => <Link className="card flex justify-between" key={q._id} href={`/admin/quotations/${q._id}`}><span>{q.quotationNumber} v{q.version} · {q.status}</span><span>{q.currency} {Number(q.grandTotal).toLocaleString("en-IN")}</span></Link>)}</div> : <EmptyState title="No quotations yet" text="Create a quote after event requirements and rates are ready." />}</section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-xl">Agreements</h2>{quotes.some((q: any) => q.status === "APPROVED") && <LinkButton href={`/admin/events/${id}/agreements/new`}>Create agreement</LinkButton>}</div>{agreements.length ? <div className="space-y-2">{agreements.map((a: any) => <Link className="card flex justify-between" key={a._id} href={`/admin/agreements/${a._id}`}><span>Agreement v{a.version}</span><span>{a.status}</span></Link>)}</div> : <EmptyState title="No agreements yet" text="An approved quotation is required to prepare the 17-section agreement." />}</section>
      </div>
      <Card><h2 className="mb-3 font-serif text-xl">Update status</h2><EventStatusForm id={id} status={event.status} /></Card>
    </div>
  </>;
}
