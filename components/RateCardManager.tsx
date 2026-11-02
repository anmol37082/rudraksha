"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, fmtDate } from "@/lib/client";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";

export function RateCardManager({ initial }: { initial: any[] }) {
  const router = useRouter();
  const [rates, setRates] = useState(initial);
  const [role, setRole] = useState("");
  const [unit, setUnit] = useState("PER_SHIFT");
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const current = useMemo(() => new Map<string, any>(rates.filter((rate) => rate.isActive).map((rate) => [rate.roleKey, rate])), [rates]);

  function updateRole(value: string) {
    setRole(value);
    if (/welcome hostess/i.test(value)) { setUnit("PER_SHIFT"); setHours(8); }
    else if (/butler|gunman|\bas[o0]\b/i.test(value)) { setUnit("PER_EVENT"); setHours(12); }
    else { setUnit("PER_SHIFT"); setHours(12); }
  }

  async function submit(form: HTMLFormElement) {
    setBusy(true); setError("");
    const values = new FormData(form);
    const overtimeRules = {
      firstExtensionHours: Number(values.get("firstExtensionHours")),
      firstExtensionMultiplier: Number(values.get("firstExtensionMultiplier")),
      nextExtensionHours: Number(values.get("nextExtensionHours")),
      nextExtensionMultiplier: Number(values.get("nextExtensionMultiplier")),
      plannerAuthorizationRequired: true,
    };
    const body = {
      role: values.get("role"), pricingUnit: values.get("pricingUnit"), rate: values.get("rate"), currency: values.get("currency"),
      effectiveFrom: values.get("effectiveFrom"), effectiveTo: values.get("effectiveTo") || undefined,
      standardShiftHours: values.get("standardShiftHours"), overtimeRules, notes: values.get("notes"), isActive: true,
    };
    const result = await api("/api/rate-cards", "POST", body);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    const key = result.data.roleKey;
    setRates((items) => [...items.map((item) => item.roleKey === key ? { ...item, isActive: false, effectiveTo: result.data.effectiveFrom } : item), result.data]);
    form.reset(); setRole(""); setUnit("PER_SHIFT"); setHours(12); router.refresh();
  }

  async function deactivate(id: string) {
    const result = await api(`/api/rate-cards/${id}`, "PUT", { isActive: false });
    if (!result.success) { setError(result.message); return; }
    setRates((items) => items.map((rate) => rate._id === id ? { ...rate, isActive: false } : rate));
  }

  return <div className="space-y-6">
    <form method="post" key="rate-form" className="card grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
      <h2 className="sm:col-span-2 font-serif text-xl">Create a rate-card version</h2>
      <Field label="Staff role"><Input name="role" required minLength={2} maxLength={120} value={role} onChange={(e) => updateRole(e.target.value)} /></Field>
      <Field label="Pricing unit"><Select name="pricingUnit" value={unit} onChange={(e) => setUnit(e.target.value)}><option value="PER_PERSON">Per person</option><option value="PER_SHIFT">Per shift</option><option value="PER_EVENT">Per event</option></Select></Field>
      <Field label="Rate"><Input name="rate" type="number" min="0.01" step="0.01" required placeholder="Enter the approved rate" /></Field>
      <Field label="Currency"><Input name="currency" defaultValue="INR" minLength={3} maxLength={3} required /></Field>
      <Field label="Effective from"><Input name="effectiveFrom" type="date" required /></Field>
      <Field label="Effective to (optional)"><Input name="effectiveTo" type="date" /></Field>
      <Field label="Standard shift hours"><Input name="standardShiftHours" type="number" min="1" max="24" value={hours} onChange={(e) => setHours(Number(e.target.value))} required /></Field>
      <div className="sm:col-span-2"><h3 className="font-medium">Role overtime rule</h3><p className="mb-3 text-xs text-stone-600">Contract defaults for 12-hour shifts are two 4-hour half-shift charges. Configure by role; authorization remains required.</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="First extension hours"><Input name="firstExtensionHours" type="number" min="0" max="24" defaultValue={4} required /></Field>
          <Field label="First extension multiplier"><Input name="firstExtensionMultiplier" type="number" min="0" max="5" step="0.1" defaultValue={0.5} required /></Field>
          <Field label="Next extension hours"><Input name="nextExtensionHours" type="number" min="0" max="24" defaultValue={4} required /></Field>
          <Field label="Next extension multiplier"><Input name="nextExtensionMultiplier" type="number" min="0" max="5" step="0.1" defaultValue={0.5} required /></Field>
        </div>
      </div>
      <div className="sm:col-span-2"><Field label="Notes"><Textarea name="notes" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Create rate-card version"}</Button></div>
    </form>
    {rates.length ? <div className="responsive-table overflow-x-auto rounded-2xl border border-forest-200/70 bg-white"><table className="w-full min-w-[760px]"><thead className="bg-forest-50"><tr>{["Role", "Unit", "Rate", "Effective", "Shift hours", "Version", "Status", ""].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead><tbody className="divide-y divide-forest-100">{rates.map((rate) => <tr key={rate._id}>
      <td className="td font-medium">{rate.role}</td><td className="td">{rate.pricingUnit.replaceAll("_", " ")}</td><td className="td">{rate.currency} {Number(rate.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td className="td">{fmtDate(rate.effectiveFrom)} – {fmtDate(rate.effectiveTo)}</td><td className="td">{rate.standardShiftHours}h</td><td className="td">v{rate.version}</td><td className="td"><Badge status={rate.isActive ? "ACTIVE" : "INACTIVE"} /></td>
      <td className="td text-right">{rate.isActive && <Button small type="button" variant="outline" onClick={() => void deactivate(rate._id)}>Deactivate</Button>}</td>
    </tr>)}</tbody></table></div> : <p className="text-sm text-stone-600">No rate cards yet. Enter rates supplied by an authorized business administrator; no prices are prefilled.</p>}
  </div>;
}
