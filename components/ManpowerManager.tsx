"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ActionDialog } from "@/components/ActionDialog";

export function ManpowerManager({ eventId, initial, services }: { eventId: string; initial: any[]; services: any[] }) {
  const router = useRouter(); const [items, setItems] = useState(initial); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [shiftHours,setShiftHours]=useState(12); const [decision, setDecision] = useState<{ id: string; approvalStatus: string } | null>(null);
  async function submit(form: HTMLFormElement) {
    setBusy(true); setError(""); const f = new FormData(form);
    const body = { eventId, role: f.get("role"), serviceId: f.get("serviceId") || undefined, requiredQuantity: f.get("requiredQuantity"), eventDate: f.get("eventDate"), shiftStart: f.get("shiftStart"), shiftEnd: f.get("shiftEnd"), standardShiftHours: f.get("standardShiftHours"), dutyDescription: f.get("dutyDescription"), reportingLocation: f.get("reportingLocation"), specialInstructions: f.get("specialInstructions"), requiredSkills: String(f.get("requiredSkills") || "").split(",").map(x => x.trim()).filter(Boolean), licenceReference: f.get("licenceReference"), venuePermissionReference: f.get("venuePermissionReference"), writtenConfirmationReference: f.get("writtenConfirmationReference") };
    const result = await api("/api/manpower-requirements", "POST", body); setBusy(false);
    if (!result.success) { setError(result.message); return; } setItems([result.data, ...items]); form.reset(); router.refresh();
  }
  async function decide(values: Record<string, string>) {
    if (!decision) return;
    setBusy(true); setError("");
    const result = await api(`/api/manpower-requirements/${decision.id}`, "PUT", { approvalStatus: decision.approvalStatus, reason: values.reason });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setItems(items.map(x => x._id === decision.id ? result.data : x)); setDecision(null);
  }
  return <div className="space-y-6">
    {decision && <ActionDialog title={`${decision.approvalStatus === "APPROVED" ? "Approve" : "Reject"} staffing requirement`} description="Add the reason that will be recorded in the audit history." fields={[{ name: "reason", label: "Reason", required: true, multiline: true }]} submitLabel={decision.approvalStatus === "APPROVED" ? "Approve requirement" : "Reject requirement"} busy={busy} onCancel={() => setDecision(null)} onSubmit={(values) => void decide(values)} />}
    <form method="post" className="card grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void submit(e.currentTarget); }}>
      <h2 className="sm:col-span-2 font-serif text-xl">Add event staffing requirement</h2>
      <Field label="Staff role"><Input name="role" required minLength={2} maxLength={120} onChange={e=>setShiftHours(/welcome hostess/i.test(e.target.value)?8:12)} /></Field>
      <Field label="Related service (optional)"><Select name="serviceId"><option value="">Select if applicable</option>{services.map(s => <option key={s._id} value={s._id}>{s.name}{s.isRegulated ? " (regulated)" : ""}</option>)}</Select></Field>
      <Field label="Quantity"><Input name="requiredQuantity" type="number" min="1" max="10000" required /></Field><Field label="Event date"><Input name="eventDate" type="date" required /></Field>
      <Field label="Shift start"><Input name="shiftStart" type="time" required /></Field><Field label="Shift end"><Input name="shiftEnd" type="time" required /></Field>
      <Field label="Standard shift hours"><Input name="standardShiftHours" type="number" min="1" max="24" value={shiftHours} onChange={e=>setShiftHours(Number(e.target.value))} required /></Field><Field label="Required skills (comma separated)"><Input name="requiredSkills" /></Field>
      <Field label="Reporting location"><Input name="reportingLocation" maxLength={300} /></Field><Field label="Duty description"><Input name="dutyDescription" maxLength={2000} /></Field>
      <div className="sm:col-span-2"><Field label="Special instructions"><Textarea name="specialInstructions" maxLength={3000} /></Field></div>
      <details className="sm:col-span-2 rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Regulated service evidence references (required before regulated work approval)</summary><div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="Licence reference"><Input name="licenceReference" maxLength={500} /></Field><Field label="Venue permission reference"><Input name="venuePermissionReference" maxLength={500} /></Field><Field label="Written confirmation reference"><Input name="writtenConfirmationReference" maxLength={500} /></Field></div></details>
      {error && <p className="sm:col-span-2 text-sm text-rose-700" role="alert">{error}</p>}<div className="sm:col-span-2"><Button disabled={busy}>{busy ? "Saving…" : "Add pending requirement"}</Button></div>
    </form>
    {items.length ? <div className="space-y-3">{items.map(item => <article className="card flex flex-wrap items-center justify-between gap-3" key={item._id}><div><p className="font-medium">{item.role} × {item.requiredQuantity} · {new Date(item.eventDate).toLocaleDateString("en-IN")}</p><p className="text-sm text-stone-600">{item.shiftStart}–{item.shiftEnd} · {item.reportingLocation || "Location TBD"}</p><Badge status={item.approvalStatus} />{item.serviceId?.isRegulated && <p className="mt-1 text-xs">Regulatory refs: {[item.licenceReference,item.venuePermissionReference,item.writtenConfirmationReference].filter(Boolean).join(" · ") || "Missing"}</p>}</div>{item.approvalStatus === "PENDING" && <div className="flex gap-2"><Button small type="button" onClick={() => setDecision({ id: item._id, approvalStatus: "APPROVED" })}>Approve</Button><Button small type="button" variant="outline" onClick={() => setDecision({ id: item._id, approvalStatus: "REJECTED" })}>Reject</Button></div>}</article>)}</div> : <p className="text-sm text-stone-600">No event-specific staffing requirements yet.</p>}
  </div>;
}
