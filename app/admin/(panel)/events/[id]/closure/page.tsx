import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Agreement, Event, EventChangeRequest, EventDocument, EventStaffAssignment, EventTask, Expense, Guest, Invoice, Payment, ShiftRecord, TransportSchedule } from "@/models";
import { plain } from "@/lib/api";
import { Badge, Card, PageTitle } from "@/components/ui";
import { EventStatusForm } from "@/components/EventStatusForm";
import { EventDocumentManager } from "@/components/EventDocumentManager";

export default async function EventClosurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const [event, guests, assignments, shifts, tasks, expenses, invoices, payments, changes, transport, documents, agreements] = await Promise.all([
    Event.findById(id).lean(), Guest.countDocuments({ eventId: id }), EventStaffAssignment.find({ eventId: id }).lean(), ShiftRecord.find({ eventId: id }).lean(),
    EventTask.find({ eventId: id }).lean(), Expense.find({ eventId: id }).lean(), Invoice.find({ eventId: id }).lean(), Payment.find({ eventId: id }).lean(),
    EventChangeRequest.find({ eventId: id }).lean(), TransportSchedule.find({ eventId: id }).lean(), EventDocument.find({ eventId: id }).select("documentType version file.publicId file.resourceType file.format file.bytes file.originalName createdAt").lean(), Agreement.find({ eventId: id }).select("version status").lean(),
  ]);
  if (!event) notFound();
  const e = plain(event) as any; const ass = plain(assignments) as any[]; const sh = plain(shifts) as any[]; const ex = plain(expenses) as any[];
  const inv = plain(invoices) as any[]; const taskRows = plain(tasks) as any[]; const changeRows = plain(changes) as any[]; const transportRows = plain(transport) as any[];
  const byCurrency = (items:any[], amount:(item:any)=>number) => [...new Set(items.map(x=>x.currency))].map(currency=>`${currency} ${items.filter(x=>x.currency===currency).reduce((n,x)=>n+amount(x),0).toLocaleString("en-IN")}`).join(" · ") || "0";
  const approvedExpenseTotal = byCurrency(ex.filter(x=>x.approvalStatus==="APPROVED"),x=>x.amount);
  const invoiced = byCurrency(inv,x=>x.grandTotal); const received = byCurrency(inv,x=>x.amountReceived);
  const outstanding = byCurrency(inv,x=>Math.max(0,x.grandTotal-x.amountReceived));
  const rows = [
    ["Event status", e.status], ["Final guest count", e.actualGuestCount ?? guests], ["Confirmed/completed staff deployment", ass.filter(x=>["CONFIRMED","COMPLETED"].includes(x.status)).length],
    ["Completed shifts", sh.filter(x=>x.status==="COMPLETED").length], ["Pending overtime approvals", sh.filter(x=>x.overtimeStatus==="PENDING").length],
    ["Approved expenses", approvedExpenseTotal], ["Final invoice total", invoiced],
    ["Received payments", received], ["Pending payments", outstanding],
    ["Open tasks", taskRows.filter(x=>x.status!=="COMPLETED").length], ["Pending change requests", changeRows.filter(x=>x.approvalStatus==="PENDING").length],
    ["Transport issues", transportRows.filter(x=>x.status==="ISSUE_REPORTED").length], ["Event documents", documents.length], ["Agreement records", agreements.length],
  ];
  return <><PageTitle title={`Event closure · ${e.eventName}`} /><p className="mb-5 text-sm text-stone-600">Review these current records before closure. Closing stores a timestamped summary snapshot and retains the event and its history.</p>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><Card><h2 className="mb-3 font-serif text-xl">Closure review</h2><dl className="divide-y">{rows.map(([label,value])=><div className="flex justify-between gap-5 py-3" key={String(label)}><dt className="text-stone-500">{label}</dt><dd className="text-right font-medium">{String(value)}</dd></div>)}</dl>{e.closureSnapshot&&<div className="mt-4 rounded-xl bg-forest-50 p-4"><p className="font-medium">Closure summary recorded</p><p className="text-sm">{e.closureSnapshot.summary}</p><p className="text-xs text-stone-500">{new Date(e.closureSnapshot.closedAt).toLocaleString("en-IN")}</p></div>}</Card><Card><h2 className="mb-3 font-serif text-xl">Close event</h2><p className="mb-4 text-sm text-stone-600">Allowed after completion or cancellation. Add a summary; unresolved tasks, payments, overtime or transport issues are captured for future reference.</p><EventStatusForm id={id} status={e.status}/></Card></div>
    <Card className="mt-5"><h2 className="mb-2 font-serif text-xl">Final documents and finance records</h2>{(plain(agreements) as any[]).map(x=><p className="border-b py-2 text-sm" key={x._id}>Agreement v{x.version} · {x.status}</p>)}{(plain(documents) as any[]).map(x=><p className="border-b py-2 text-sm" key={x._id}>{x.documentType} · v{x.version} · {new Date(x.createdAt).toLocaleDateString("en-IN")}</p>)}{ex.map(x=><p className="border-b py-2 text-sm" key={x._id}>{x.category}: {x.currency} {x.amount} · <Badge status={x.approvalStatus}/></p>)}{inv.map(x=><p className="border-b py-2 text-sm" key={x._id}>Invoice {x.invoiceNumber}: {x.currency} {x.grandTotal}, received {x.amountReceived}</p>)}<p className="mt-3 text-xs text-stone-500">Payment transaction records: {(plain(payments) as any[]).length}. See Finance for receipts.</p></Card>
    <EventDocumentManager eventId={id} initialDocuments={plain(documents) as any[]} />
  </>;
}
