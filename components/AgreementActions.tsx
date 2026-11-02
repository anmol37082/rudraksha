"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { ActionDialog, type ActionDialogField } from "@/components/ActionDialog";
import { Button } from "@/components/ui";

export function AgreementActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [action, setAction] = useState<{ kind: "send" } | { kind: "accept"; party: "CLIENT" | "PROVIDER" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(values: Record<string, string>) {
    if (!action) return;
    setBusy(true); setError("");
    const result = action.kind === "send"
      ? await api(`/api/agreements/${id}/status`, "PUT", { reference: values.reference })
      : await api(`/api/agreements/${id}/acceptance`, "POST", { party: action.party, acceptedBy: values.acceptedBy, method: values.method, reference: values.reference });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setAction(null); router.refresh();
  }

  const fields: ActionDialogField[] = action?.kind === "send"
    ? [{ name: "reference", label: "How/when was this agreement sent?", required: true, multiline: true }]
    : [{ name: "acceptedBy", label: `Name of ${action?.kind === "accept" ? action.party.toLowerCase() : ""} signatory`, required: true }, { name: "method", label: "Acceptance method (wet signature, email, etc.)", required: true }, { name: "reference", label: "Signature/document reference or evidence location", required: true, multiline: true }];

  return <div className="flex flex-wrap gap-2">
    {action && <ActionDialog title={action.kind === "send" ? "Record agreement as sent" : `Record ${action.party.toLowerCase()} acceptance`} fields={fields} submitLabel={action.kind === "send" ? "Record sent" : "Record acceptance"} busy={busy} onCancel={() => setAction(null)} onSubmit={(values) => void submit(values)} />}
    {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
    {status === "DRAFT" && <Button type="button" onClick={() => setAction({ kind: "send" })}>Record as sent</Button>}
    {["SENT", "PARTIALLY_SIGNED"].includes(status) && <><Button type="button" onClick={() => setAction({ kind: "accept", party: "CLIENT" })}>Record client acceptance</Button><Button type="button" variant="outline" onClick={() => setAction({ kind: "accept", party: "PROVIDER" })}>Record provider acceptance</Button></>}
  </div>;
}
