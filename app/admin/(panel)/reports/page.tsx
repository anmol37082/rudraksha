import Link from "next/link";
import { Application, AuditLog, Event, EventChangeRequest, EventStaffAssignment, Expense, Interview, Invoice, Position, Quotation, ShiftRecord, Staff, User } from "@/models";
import { Card, PageTitle } from "@/components/ui";
import { plain } from "@/lib/api";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await connectDB();
  const now = new Date();
  const [candidateCount, positionCount, applicationCount, interviewCount, totalStaff, activeStaff, inactiveStaff, events, clients, quotes, invoices, expenses, recentAudit, assignments, staffByRole, recentAssignments, shiftStats, changeStats] = await Promise.all([
    User.countDocuments({ role: "CANDIDATE" }), Position.countDocuments(), Application.countDocuments(), Interview.countDocuments(),
    Staff.countDocuments(), Staff.countDocuments({ status: "ACTIVE" }), Staff.countDocuments({ status: { $ne: "ACTIVE" } }),
    Event.find().sort({ eventDate: -1 }).populate("clientId", "name").lean(),
    Event.aggregate([{ $group: { _id: "$clientId", count: { $sum: 1 } } }]),
    Quotation.aggregate([{ $match: { status: { $in: ["SENT", "APPROVED"] } } }, { $group: { _id: { status: "$status", currency: "$currency" }, count: { $sum: 1 }, value: { $sum: "$grandTotal" } } }]),
    Invoice.aggregate([{ $match: { status: { $nin: ["VOID", "DRAFT"] } } }, { $group: { _id: { status: "$status", currency: "$currency" }, count: { $sum: 1 }, invoiced: { $sum: "$grandTotal" }, received: { $sum: "$amountReceived" } } }]),
    Expense.aggregate([{ $match: { approvalStatus: "APPROVED" } }, { $group: { _id: "$currency", total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    AuditLog.find().sort({ createdAt: -1 }).limit(100).populate("adminId", "name email").lean(),
    EventStaffAssignment.aggregate([{ $group: { _id: "$staffId", assignmentCount: { $sum: 1 }, eventIds: { $addToSet: "$eventId" } } }, { $sort: { assignmentCount: -1 } }, { $limit: 20 }]),
    Staff.aggregate([{ $group: { _id: { role: "$position", status: "$status" }, count: { $sum: 1 } } }, { $sort: { "_id.role": 1, "_id.status": 1 } }]),
    EventStaffAssignment.find().sort({ eventDate: -1 }).limit(30).populate({ path: "staffId", select: "employeeId position candidateId", populate: { path: "candidateId", model: User, select: "name" } }).populate("eventId", "eventName eventDate").lean(),
    ShiftRecord.aggregate([{ $group: { _id: "$overtimeStatus", count: { $sum: 1 } } }]),
    EventChangeRequest.aggregate([{ $group: { _id: "$approvalStatus", count: { $sum: 1 } } }]),
  ]);
  const eventRows = plain(events) as any[];
  const quoteRows = quotes as any[];
  const invoiceRows = invoices as any[];
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const approvedQuoteValue = quoteRows.filter(x => x._id.status === "APPROVED").map(x=>`${x._id.currency} ${fmt(x.value)}`).join(" · ") || "0";
  const totalQuoteValue = [...new Set(quoteRows.map(x=>x._id.currency))].map(currency=>`${currency} ${fmt(quoteRows.filter(x=>x._id.currency===currency).reduce((n,x)=>n+x.value,0))}`).join(" · ") || "0";
  const totalInvoiced = invoiceRows.map(x=>`${x._id.currency} ${fmt(x.invoiced)}`).join(" · ") || "0";
  const totalReceived = invoiceRows.map(x=>`${x._id.currency} ${fmt(x.received)}`).join(" · ") || "0";
  const pendingByCurrency = new Map<string,number>();
  for (const row of invoiceRows) pendingByCurrency.set(row._id.currency,(pendingByCurrency.get(row._id.currency)??0)+Math.max(0,row.invoiced-row.received));
  const pendingPayments = [...pendingByCurrency].map(([currency,amount])=>`${currency} ${fmt(amount)}`).join(" · ") || "0";
  const monthCounts = new Map<string, number>();
  for (const event of eventRows) { const key = new Date(event.eventDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1); }
  return <>
    <PageTitle title="Reports & audit" />
    <h2 className="mb-3 font-serif text-xl">Recruitment & staff</h2>
    <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Candidates",candidateCount],["Positions",positionCount],["Applications",applicationCount],["Interviews",interviewCount],["Total staff",totalStaff],["Active staff",activeStaff],["Inactive staff",inactiveStaff]].map(([label,value])=><Card key={String(label)}><p className="text-xs text-stone-500">{label}</p><p className="text-2xl">{value}</p></Card>)}</div>
    <h2 className="mb-3 font-serif text-xl">Event and finance totals</h2>
    <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total events",eventRows.length],["Upcoming events",eventRows.filter(e=>new Date(e.eventDate)>=now&&!['CANCELLED','CLOSED'].includes(e.status)).length],["Completed",eventRows.filter(e=>e.status==='COMPLETED'||e.status==='CLOSED').length],["Cancelled",eventRows.filter(e=>e.status==='CANCELLED').length],["Current sent/approved quotation value",totalQuoteValue],["Approved quotation value",approvedQuoteValue],["Total invoiced",totalInvoiced],["Total received",totalReceived],["Pending payments",pendingPayments]].map(([label,value])=><Card key={String(label)}><p className="text-xs text-stone-500">{label}</p><p className="text-xl">{value}</p></Card>)}</div>
    <div className="mb-7 grid gap-6 lg:grid-cols-2"><Card><h2 className="mb-3 font-serif text-xl">Events by client</h2>{(clients as any[]).map(row=>{const event=eventRows.find(e=>String(e.clientId?._id)===String(row._id));return <p className="border-b py-2" key={String(row._id)}>{event?.clientId?.name??"Client"}: {row.count}</p>})}{!clients.length&&<p className="text-sm text-stone-500">No event records.</p>}</Card><Card><h2 className="mb-3 font-serif text-xl">Events by month</h2>{[...monthCounts].map(([month,count])=><p className="border-b py-2" key={month}>{month}: {count}</p>)}</Card><Card><h2 className="mb-3 font-serif text-xl">Events by status</h2>{[...new Set(eventRows.map(e=>e.status))].map(status=><p className="border-b py-2" key={status}>{status.replaceAll("_"," ")}: {eventRows.filter(e=>e.status===status).length}</p>)}</Card><Card><h2 className="mb-3 font-serif text-xl">Approved expenses by currency</h2>{(expenses as any[]).map(x=><p className="border-b py-2" key={x._id}>{x._id}: {fmt(x.total)} ({x.count} expenses)</p>)}{!expenses.length&&<p className="text-sm text-stone-500">No approved expenses.</p>}</Card><Card><h2 className="mb-3 font-serif text-xl">Staff by role and status</h2>{(staffByRole as any[]).map(row=><p className="border-b py-2" key={`${row._id.role}-${row._id.status}`}>{row._id.role??"Unspecified role"} · {row._id.status}: {row.count}</p>)}{!staffByRole.length&&<p className="text-sm text-stone-500">No staff records.</p>}</Card><Card><h2 className="mb-3 font-serif text-xl">Staff event utilization</h2>{(plain(assignments) as any[]).map(row=><p className="border-b py-2" key={String(row._id)}><Link className="underline" href={`/admin/staff`}>Staff record</Link>: {row.assignmentCount} assignment(s), {row.eventIds.length} event(s)</p>)}{!assignments.length&&<p className="text-sm text-stone-500">No event assignments.</p>}</Card></div>
    <div className="mb-7 grid gap-6 lg:grid-cols-2"><Card><h2 className="mb-3 font-serif text-xl">Recent staff assignment history</h2>{(plain(recentAssignments) as any[]).map(row=><p className="border-b py-2 text-sm" key={row._id}>{row.staffId?.candidateId?.name??row.staffId?.employeeId??"Staff"} · {row.staffId?.position??"Role not set"} · {row.eventId?.eventName??"Event"} · {row.status}</p>)}{!recentAssignments.length&&<p className="text-sm text-stone-500">No assignments.</p>}</Card><Card><h2 className="mb-3 font-serif text-xl">Shift overtime & event changes</h2>{(shiftStats as any[]).map(row=><p className="border-b py-2" key={`overtime-${row._id??"none"}`}>Overtime {row._id??"not applicable"}: {row.count} shift(s)</p>)}{(changeStats as any[]).map(row=><p className="border-b py-2" key={`change-${row._id}`}>Change {row._id}: {row.count}</p>)}{!shiftStats.length&&!changeStats.length&&<p className="text-sm text-stone-500">No shift or change records.</p>}</Card></div>
    <Card className="mb-7"><h2 className="mb-3 font-serif text-xl">Invoice status</h2>{invoiceRows.map(row=><p className="border-b py-2" key={`${row._id.status}-${row._id.currency}`}>{row._id.status} · {row._id.currency}: {row.count} invoice(s), invoiced {fmt(row.invoiced)}, received {fmt(row.received)}</p>)}</Card>
    <section><h2 className="mb-3 font-serif text-xl">Recent admin audit log</h2><div className="space-y-2">{(plain(recentAudit) as any[]).map(row=><article className="card" key={row._id}><p className="font-medium">{row.action} · {row.targetType}</p><p className="text-sm">{row.description}</p><p className="text-xs text-stone-500">{row.adminId?.name??"Admin"} · {new Date(row.createdAt).toLocaleString("en-IN")}</p></article>)}{!recentAudit.length&&<Card><p className="text-sm text-stone-500">No audit entries.</p></Card>}</div></section>
  </>;
}
