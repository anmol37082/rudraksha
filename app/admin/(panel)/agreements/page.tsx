import Link from "next/link";
import { Agreement } from "@/models";
import { plain } from "@/lib/api";
import { Badge, EmptyState, PageTitle, Table } from "@/components/ui";
import { connectDB } from "@/lib/mongodb";
export default async function AgreementsPage() { await connectDB(); const rows = plain(await Agreement.find().sort({ createdAt: -1 }).limit(100).populate("eventId", "eventName").populate("quotationId", "quotationNumber version").lean()) as any[]; return <><PageTitle title="Agreements" />{rows.length ? <Table head={["Agreement", "Event", "Quotation", "Version", "Status", ""]}>{rows.map(a => <tr key={a._id}><td className="td">Agreement v{a.version}</td><td className="td">{a.eventId?.eventName}</td><td className="td">{a.quotationId?.quotationNumber}</td><td className="td">{a.version}</td><td className="td"><Badge status={a.status} /></td><td className="td text-right"><Link className="underline" href={`/admin/agreements/${a._id}`}>Open</Link></td></tr>)}</Table> : <EmptyState title="No agreements yet" text="Create an agreement from an event with an approved quotation." />}</>; }
