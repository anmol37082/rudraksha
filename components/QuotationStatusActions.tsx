"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { ActionDialog, type ActionDialogField } from "@/components/ActionDialog";
import { Button } from "@/components/ui";

export function QuotationStatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(values: Record<string, string>) {
    if (!nextStatus) return;
    setBusy(true); setError("");
    const result = await api(`/api/quotations/${id}/status`, "PUT", { status: nextStatus, reference: values.reference });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setNextStatus(null); router.refresh();
  }

  const label = nextStatus === "SENT" ? "Manual delivery method/reference (email, date, etc.)" : nextStatus === "APPROVED" ? "Client's written approval reference" : "Optional reference/reason";
  const fields: ActionDialogField[] = [{ name: "reference", label, required: nextStatus === "SENT" || nextStatus === "APPROVED", multiline: true }];

  return <div className="flex flex-wrap gap-2">
    {nextStatus && <ActionDialog title={`Record quotation ${nextStatus.toLowerCase()}`} fields={fields} submitLabel={`Record ${nextStatus.toLowerCase()}`} busy={busy} onCancel={() => setNextStatus(null)} onSubmit={(values) => void update(values)} />}
    {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
    {status === "DRAFT" && <Button type="button" onClick={() => setNextStatus("SENT")}>Record as sent</Button>}
    {status === "SENT" && <><Button type="button" onClick={() => setNextStatus("APPROVED")}>Record approval</Button><Button type="button" variant="outline" onClick={() => setNextStatus("DECLINED")}>Mark declined</Button><Button type="button" variant="outline" onClick={() => setNextStatus("EXPIRED")}>Mark expired</Button></>}
  </div>;
}
