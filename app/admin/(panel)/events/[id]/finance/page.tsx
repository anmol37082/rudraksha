import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { Agreement, Event, Expense, Invoice, Payment, Quotation } from "@/models";
import { plain } from "@/lib/api";
import { Card, PageTitle } from "@/components/ui";
import { EventFinanceManager } from "@/components/EventFinanceManager";

export default async function EventFinancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  const [event, expenses, invoices, payments, quotes, agreements] = await Promise.all([
    Event.findById(id).select("eventName status").lean(),
    Expense.find({ eventId: id }).sort({ date: -1, createdAt: -1 }).lean(),
    Invoice.find({ eventId: id }).sort({ createdAt: -1 }).lean(),
    Payment.find({ eventId: id }).sort({ paymentDate: -1, createdAt: -1 }).lean(),
    Quotation.find({ eventId: id, status: "APPROVED" }).sort({ version: -1 }).select("quotationNumber version grandTotal currency rsvpIncluded milestones").lean(),
    Agreement.find({ eventId: id, status: "SIGNED" }).sort({ version: -1 }).select("version status").lean(),
  ]);
  if (!event) notFound();
  return <>
    <PageTitle title={`Finance · ${(event as any).eventName}`} />
    <Card className="mb-5"><p className="text-sm text-stone-600">Finance records are entered by an administrator. Payments and refunds are recorded only after actual transaction evidence is available; invoice totals come from approved quotation snapshots.</p></Card>
    <EventFinanceManager eventId={id} expenses={plain(expenses) as any[]} invoices={plain(invoices) as any[]} payments={plain(payments) as any[]} quotes={plain(quotes) as any[]} agreements={plain(agreements) as any[]} />
  </>;
}
