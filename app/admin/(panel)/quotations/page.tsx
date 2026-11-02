import Link from "next/link";
import { Quotation } from "@/models";
import { plain } from "@/lib/api";
import { Badge, EmptyState, PageTitle, Table } from "@/components/ui";
import { fmtDate } from "@/lib/client";
export default async function QuotationsPage() { const rows = plain(await Quotation.find().sort({ createdAt: -1 }).limit(100).populate("eventId", "eventName eventDate").populate("clientId", "name").lean()) as any[]; return <><PageTitle title="Quotations" />{rows.length ? <Table head={["Quotation", "Event", "Client", "Date", "Total", "Status", ""]}>{rows.map(q => <tr key={q._id}><td className="td">{q.quotationNumber} v{q.version}</td><td className="td">{q.eventId?.eventName}</td><td className="td">{q.clientId?.name}</td><td className="td">{fmtDate(q.createdAt)}</td><td className="td">{q.currency} {Number(q.grandTotal).toLocaleString("en-IN")}</td><td className="td"><Badge status={q.status} /></td><td className="td text-right"><Link className="underline" href={`/admin/quotations/${q._id}`}>Open</Link></td></tr>)}</Table> : <EmptyState title="No quotations" text="Prepare a quotation from an event after setting its status to Quotation pending." />}</>; }
