"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { EVENT_TRANSITIONS, type EventStatus } from "@/lib/event-constants";
import { Button, Field, Input, Select } from "@/components/ui";

export function EventStatusForm({ id, status }: { id: string; status: EventStatus }) {
  const router = useRouter();
  const [next, setNext] = useState<EventStatus>(EVENT_TRANSITIONS[status][0] ?? status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(form: HTMLFormElement) {
    setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(form));
    const result = await api(`/api/events/${id}/status`, "PUT", values);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    router.refresh();
  }
  const choices = EVENT_TRANSITIONS[status];
  if (!choices.length) return <p className="text-sm text-stone-600">This event is closed. Its record is retained for history.</p>;
  return <form method="post" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
    <Field label="Next status"><Select name="status" value={next} onChange={(e) => setNext(e.target.value as EventStatus)}>{choices.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</Select></Field>
    <Field label={next === "CLOSED" ? "Closure summary" : "Change reason"}><Input name="reason" maxLength={1000} required={next === "CANCELLED" || next === "CLOSED"} placeholder={next === "CANCELLED" ? "Required for cancellation" : next === "CLOSED" ? "Summarize unresolved items or confirm closure" : "Optional reason"} /></Field>
    <Field label="Admin override reason"><Input name="overrideReason" maxLength={1000} placeholder="Only if approval/payment gates are not met" /></Field>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update status"}</Button>
  </form>;
}
