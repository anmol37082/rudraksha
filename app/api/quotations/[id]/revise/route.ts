import { NextRequest } from "next/server";
import { handle, ok, oid, parseBody, plain } from "@/lib/api";
import { quotationCreateSchema } from "@/lib/event-validators";
import { requireEventAdmin } from "@/lib/event-workflow";
import { audit } from "@/lib/notify";
import { createQuotation } from "@/lib/quotation-service";

export const POST = handle(async (req: NextRequest, { params }) => {
  const admin = await requireEventAdmin();
  const previousId = oid((await params).id);
  const data = await parseBody(req, quotationCreateSchema);
  const quote = await createQuotation(admin._id, data, previousId);
  await audit(admin._id, "Quotation revised", "Quotation", quote._id, `${quote.quotationNumber} v${quote.version}; supersedes ${previousId}; ${data.revisionReason}`);
  return ok(plain(quote), "Quotation revision created", 201);
});
