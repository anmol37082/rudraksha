import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Agreement, Client, Event, Invoice, Payment, Quotation } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { Badge, Card, EmptyState, LinkButton, PageTitle, Table } from "@/components/ui";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const client = await Client.findById(id).lean();
  if (!client) notFound();
  const [eventRows, quoteRows, agreementRows, invoiceRows, paymentRows] = await Promise.all([
    Event.find({ clientId: id }).sort({ eventDate: -1 }).lean(),
    Quotation.find({ clientId: id }).sort({ createdAt: -1 }).lean(),
    Agreement.find({ eventId: { $in: await Event.find({ clientId: id }).distinct("_id") } }).sort({ createdAt: -1 }).lean(),
    Invoice.find({ clientId: id }).sort({ createdAt: -1 }).lean(),
    Payment.find({ clientId: id }).sort({ paymentDate: -1 }).lean(),
  ]);
  const events = plain(eventRows) as any[];
  const quotations = plain(quoteRows) as any[];
  const agreements = plain(agreementRows) as any[];
  const invoices = plain(invoiceRows) as any[];
  const payments = plain(paymentRows) as any[];
  const c = plain(client) as any;
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.grandTotal - (invoice.amountReceived ?? 0)), 0);
  const money = (amount: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount || 0);
  return <>
    <PageTitle title={c.name}><div className="flex gap-2"><LinkButton variant="outline" href={`/admin/clients/${id}/edit`}>Edit client</LinkButton><LinkButton href={`/admin/events/new?clientId=${id}`}>New event</LinkButton></div></PageTitle>
    <Card className="mb-6 grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs uppercase text-stone-500">Business</p><p>{c.businessName || "—"}</p></div>
      <div><p className="text-xs uppercase text-stone-500">Status</p><Badge status={c.status} /></div>
      <div><p className="text-xs uppercase text-stone-500">Contact person</p><p>{c.contactPerson}</p></div>
      <div><p className="text-xs uppercase text-stone-500">Email / phone</p><p>{c.email} · {c.phone}</p></div>
      <div><p className="text-xs uppercase text-stone-500">Address</p><p>{[c.businessAddress, c.city, c.state, c.country].filter(Boolean).join(", ") || "—"}</p></div>
      <div><p className="text-xs uppercase text-stone-500">Authorized representative</p><p>{c.authorizedRepresentative || "—"}</p></div>
      <div><p className="text-xs uppercase text-stone-500">GST number</p><p>{c.gstNumber || "—"}</p></div>
      <div><p className="text-xs uppercase text-stone-500">Created</p><p>{fmtDate(c.createdAt)}</p></div>
      {c.notes && <div className="sm:col-span-2"><p className="text-xs uppercase text-stone-500">Internal notes</p><p className="whitespace-pre-wrap">{c.notes}</p></div>}
    </Card>
    <h2 className="mb-3 font-serif text-xl">Event history</h2>
    {events.length ? <Table head={["Event", "Dates", "Venue", "Status", ""]}>{events.map((e) => <tr key={e._id}>
      <td className="td font-medium">{e.eventName}</td><td className="td">{fmtDate(e.eventDate)} – {fmtDate(e.eventEndDate)}</td>
      <td className="td">{e.venues?.[0]?.name || "—"}</td><td className="td"><Badge status={e.status} /></td>
      <td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/events/${e._id}`}>Open event</Link></td>
    </tr>)}</Table> : <EmptyState title="No events yet" text="Events created for this planner will appear here." />}
    <div className="mt-7 grid gap-6 xl:grid-cols-2">
      <section><h2 className="mb-3 font-serif text-xl">Quotations</h2>{quotations.length ? <Table head={["Number", "Version", "Total", "Status", ""]}>{quotations.map((q) => <tr key={q._id}>
        <td className="td">{q.quotationNumber}</td><td className="td">v{q.version}</td><td className="td">{money(q.grandTotal, q.currency)}</td><td className="td"><Badge status={q.status} /></td><td className="td text-right"><Link className="text-forest-700 underline" href={`/admin/events/${q.eventId}`}>Event</Link></td>
      </tr>)}</Table> : <EmptyState title="No quotations" text="Event quotations for this client will appear here." />}</section>
      <section><h2 className="mb-3 font-serif text-xl">Agreements</h2>{agreements.length ? <Table head={["Event", "Version", "Status"]}>{agreements.map((a) => <tr key={a._id}><td className="td"><Link className="text-forest-700 underline" href={`/admin/events/${a.eventId}`}>Open event</Link></td><td className="td">v{a.version}</td><td className="td"><Badge status={a.status} /></td></tr>)}</Table> : <EmptyState title="No agreements" text="Agreement records linked to this client's events will appear here." />}</section>
      <section><h2 className="mb-3 font-serif text-xl">Invoices & outstanding balance</h2><Card className="mb-3"><p className="text-xs uppercase text-stone-500">Outstanding</p><p className="text-xl font-semibold">{money(outstanding)}</p></Card>{invoices.length ? <Table head={["Invoice", "Total", "Received", "Due", "Status"]}>{invoices.map((invoice) => <tr key={invoice._id}><td className="td">{invoice.invoiceNumber}</td><td className="td">{money(invoice.grandTotal, invoice.currency)}</td><td className="td">{money(invoice.amountReceived ?? 0, invoice.currency)}</td><td className="td">{fmtDate(invoice.dueDate)}</td><td className="td"><Badge status={invoice.status} /></td></tr>)}</Table> : <EmptyState title="No invoices" text="Invoices and balances will appear here after they are created." />}</section>
      <section><h2 className="mb-3 font-serif text-xl">Payment history</h2>{payments.length ? <Table head={["Date", "Amount", "Method", "Reference", "Status"]}>{payments.map((payment) => <tr key={payment._id}><td className="td">{fmtDate(payment.paymentDate)}</td><td className="td">{money(payment.amount, payment.currency)}</td><td className="td">{payment.paymentMethod.replaceAll("_", " ")}</td><td className="td">{payment.transactionReference || "—"}</td><td className="td"><Badge status={payment.status} /></td></tr>)}</Table> : <EmptyState title="No payments recorded" text="Only actual recorded transactions appear here." />}</section>
    </div>
  </>;
}
