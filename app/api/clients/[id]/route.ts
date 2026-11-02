import { NextRequest } from "next/server";
import { ApiError, handle, ok, oid, parseBody, plain } from "@/lib/api";
import { Agreement, Client, Event, Invoice, Payment, Quotation } from "@/models";
import { audit } from "@/lib/notify";
import { clientSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";

export const GET = handle(async (_req: NextRequest, { params }) => {
  await requireEventAdmin();
  const id = oid((await params).id);
  const client = await Client.findById(id).lean();
  if (!client) throw new ApiError(404, "Client not found");
  const [events, quotations, agreements, invoices, payments] = await Promise.all([
    Event.find({ clientId: id }).sort({ eventDate: -1 }).lean(),
    Quotation.find({ clientId: id }).sort({ createdAt: -1 }).select("quotationNumber eventId version grandTotal currency status createdAt").lean(),
    Agreement.find({ eventId: { $in: await Event.find({ clientId: id }).distinct("_id") } }).sort({ createdAt: -1 }).select("eventId version status createdAt").lean(),
    Invoice.find({ clientId: id }).sort({ createdAt: -1 }).select("invoiceNumber eventId grandTotal amountReceived currency status dueDate").lean(),
    Payment.find({ clientId: id }).sort({ paymentDate: -1 }).select("eventId invoiceId amount currency paymentDate paymentMethod transactionReference status").lean(),
  ]);
  return ok(plain({ client, events, quotations, agreements, invoices, payments }));
});

export const PUT = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const id = oid((await params).id);
  const data = await parseBody(req, clientSchema.partial());
  const before = await Client.findById(id);
  if (!before) throw new ApiError(404, "Client not found");
  Object.assign(before, data);
  await before.save();
  await audit(admin._id, "Client updated", "Client", id, Object.keys(data).join(", "));
  return ok(plain(before), "Client updated");
});
