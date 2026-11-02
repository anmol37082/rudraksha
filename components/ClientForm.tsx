"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

export function ClientForm({ client }: { client?: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(form: HTMLFormElement) {
    setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(form));
    const result = client
      ? await api(`/api/clients/${client._id}`, "PUT", body)
      : await api("/api/clients", "POST", body);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    router.push(`/admin/clients/${client?._id ?? result.data._id}`);
    router.refresh();
  }
  return <form method="post" className="card grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
    <Field label="Planner / client name"><Input name="name" required minLength={2} maxLength={120} defaultValue={client?.name} /></Field>
    <Field label="Business name"><Input name="businessName" maxLength={160} defaultValue={client?.businessName} /></Field>
    <Field label="Contact person"><Input name="contactPerson" required defaultValue={client?.contactPerson} /></Field>
    <Field label="Email"><Input name="email" type="email" required defaultValue={client?.email} /></Field>
    <Field label="Phone"><Input name="phone" type="tel" required defaultValue={client?.phone} /></Field>
    <Field label="Alternate phone"><Input name="alternatePhone" type="tel" defaultValue={client?.alternatePhone} /></Field>
    <Field label="Business address"><Input name="businessAddress" defaultValue={client?.businessAddress} /></Field>
    <Field label="City"><Input name="city" defaultValue={client?.city} /></Field>
    <Field label="State"><Input name="state" defaultValue={client?.state} /></Field>
    <Field label="Country"><Input name="country" defaultValue={client?.country ?? "India"} /></Field>
    <Field label="GST number (optional)"><Input name="gstNumber" defaultValue={client?.gstNumber} /></Field>
    <Field label="Authorized representative"><Input name="authorizedRepresentative" defaultValue={client?.authorizedRepresentative} /></Field>
    {client && <Field label="Status"><Select name="status" defaultValue={client.status}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></Select></Field>}
    <div className="sm:col-span-2"><Field label="Internal notes"><Textarea name="notes" maxLength={4000} defaultValue={client?.notes} /></Field></div>
    {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
    <div className="sm:col-span-2 flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : client ? "Save client" : "Create client"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
  </form>;
}
