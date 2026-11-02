"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

export function EventForm({ clients, event, duplicateId }: { clients: any[]; event?: any; duplicateId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(form: HTMLFormElement) {
    setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const body = {
      clientId: data.clientId,
      eventName: data.eventName,
      eventType: data.eventType,
      coupleOrHostName: data.coupleOrHostName,
      eventDate: data.eventDate,
      eventEndDate: data.eventEndDate,
      numberOfEventDays: Number(data.numberOfEventDays),
      venues: [{ name: data.venueName, address: data.venueAddress, city: data.city, state: data.state }],
      estimatedGuestCount: Number(data.estimatedGuestCount),
      actualGuestCount: data.actualGuestCount ? Number(data.actualGuestCount) : undefined,
      description: data.description,
      internalNotes: data.internalNotes,
    };
    const result = duplicateId
      ? await api(`/api/events/${duplicateId}/duplicate`, "POST", body)
      : event
        ? await api(`/api/events/${event._id}`, "PUT", body)
        : await api("/api/events", "POST", body);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    router.push(`/admin/events/${event?._id ?? result.data._id}`);
    router.refresh();
  }
  const venue = event?.venues?.[0] ?? {};
  return <form method="post" className="card grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
    <Field label="Client / event planner"><Select name="clientId" required defaultValue={event?.clientId?._id ?? event?.clientId ?? clients[0]?._id ?? ""}><option value="" disabled>Select client</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}{c.businessName ? ` · ${c.businessName}` : ""}</option>)}</Select></Field>
    <Field label="Event name"><Input name="eventName" required minLength={2} maxLength={180} defaultValue={event?.eventName} /></Field>
    <Field label="Event type"><Input name="eventType" defaultValue={event?.eventType} placeholder="Wedding, reception, corporate…" /></Field>
    <Field label="Couple / host"><Input name="coupleOrHostName" defaultValue={event?.coupleOrHostName} /></Field>
    <Field label="Start date"><Input name="eventDate" type="date" required defaultValue={event?.eventDate ? new Date(event.eventDate).toISOString().slice(0, 10) : ""} /></Field>
    <Field label="End date"><Input name="eventEndDate" type="date" required defaultValue={event?.eventEndDate ? new Date(event.eventEndDate).toISOString().slice(0, 10) : ""} /></Field>
    <Field label="Event days"><Input name="numberOfEventDays" type="number" min="1" max="90" required defaultValue={event?.numberOfEventDays ?? 1} /></Field>
    <Field label="Estimated guest count"><Input name="estimatedGuestCount" type="number" min="0" defaultValue={event?.estimatedGuestCount ?? 0} /></Field>
    <Field label="Actual guest count"><Input name="actualGuestCount" type="number" min="0" defaultValue={event?.actualGuestCount ?? ""} /></Field>
    <Field label="Venue name"><Input name="venueName" required defaultValue={venue.name} /></Field>
    <Field label="Venue address"><Input name="venueAddress" defaultValue={venue.address} /></Field>
    <Field label="City"><Input name="city" defaultValue={venue.city} /></Field>
    <Field label="State"><Input name="state" defaultValue={venue.state} /></Field>
    <div className="sm:col-span-2"><Field label="Event description"><Textarea name="description" defaultValue={event?.description} /></Field></div>
    <div className="sm:col-span-2"><Field label="Internal notes"><Textarea name="internalNotes" defaultValue={event?.internalNotes} /></Field></div>
    {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
    <div className="sm:col-span-2 flex gap-3"><Button type="submit" disabled={busy || !clients.length}>{busy ? "Saving…" : duplicateId ? "Create draft copy" : event ? "Save event" : "Create draft event"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
    {!clients.length && <p className="sm:col-span-2 text-sm text-amber-800">Create an active client before creating an event.</p>}
  </form>;
}
