import { NextRequest, NextResponse } from "next/server";
import { ApiError, handle, oid } from "@/lib/api";
import { Agreement } from "@/models";
import { requireEventAdmin } from "@/lib/event-workflow";
import { createAgreementPdf } from "@/lib/agreement-pdf";
export const GET = handle(async (_req: NextRequest, { params }) => { await requireEventAdmin(); const id = oid((await params).id); const agreement = await Agreement.findById(id).lean() as any; if (!agreement) throw new ApiError(404, "Agreement not found"); const bytes = createAgreementPdf(agreement); return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="agreement-v${agreement.version}.pdf"`, "Cache-Control": "private, no-store" } }); });
