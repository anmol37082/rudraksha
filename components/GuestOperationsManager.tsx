"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { ActionDialog, type ActionDialogField } from "@/components/ActionDialog";

export function GuestOperationsManager({
  eventId,
  rsvpEnabled,
  guests: initialGuests,
  rooms: initialRooms,
  transport: initialTransport,
}: {
  eventId: string;
  rsvpEnabled: boolean;
  guests: any[];
  rooms: any[];
  transport: any[];
}) {
  const router = useRouter();
  const [guests, setGuests] = useState(initialGuests);
  const [rooms, setRooms] = useState(initialRooms);
  const [transport, setTransport] = useState(initialTransport);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [rsvpFilter, setRsvpFilter] = useState("");
  const [csvText, setCsvText] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [action, setAction] = useState<{ kind: "bulk-rsvp"; status: "CONFIRMED" | "DECLINED" } | { kind: "edit-guest"; guest: any } | { kind: "manual"; guestId: string; category: "rsvp" | "invitation"; action: string; status?: string } | { kind: "room"; id: string; status: string } | { kind: "transport"; item: any; status: string } | null>(null);

  const visibleGuests = useMemo(
    () => guests.filter((guest) =>
      (!query || `${guest.name} ${guest.contactNumber} ${guest.email} ${guest.category} ${guest.groupName}`.toLowerCase().includes(query.toLowerCase())) &&
      (!rsvpFilter || guest.rsvpStatus === rsvpFilter)),
    [guests, query, rsvpFilter],
  );
  const assignedGuestIds = new Set(rooms.filter((room) => room.status !== "CANCELLED").map((room) => String(room.guestId?._id ?? room.guestId)));
  const unassignedGuests = guests.filter((guest) => guest.roomRequired && !assignedGuestIds.has(guest._id));

  async function guestSubmit(form: HTMLFormElement) {
    setBusy(true); setError("");
    const formData = new FormData(form);
    const body = {
      eventId, name: formData.get("name"), contactNumber: formData.get("contactNumber"), email: formData.get("email"),
      category: formData.get("category"), groupName: formData.get("groupName"), hostRelationship: formData.get("hostRelationship"),
      arrivalDate: formData.get("arrivalDate") || undefined, departureDate: formData.get("departureDate") || undefined,
      travelMode: formData.get("travelMode"), flightTrainDetails: formData.get("flightTrainDetails"), roomRequired: formData.get("roomRequired") === "on",
      specialRequests: formData.get("specialRequests"), dietaryRequirements: formData.get("dietaryRequirements"),
      accessibilityNotes: formData.get("accessibilityNotes"), internalNotes: formData.get("internalNotes"),
    };
    const result = await api("/api/guests", "POST", body);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setGuests([...guests, result.data]); form.reset(); router.refresh();
  }

  async function attendance(id: string, checkInStatus: string) {
    const result = await api(`/api/guests/${id}/attendance`, "PUT", { checkInStatus });
    if (!result.success) { setError(result.message); return; }
    setGuests(guests.map((guest) => guest._id === id ? { ...guest, ...result.data } : guest));
  }

  async function bulkRsvp(status: "CONFIRMED" | "DECLINED") {
    if (!selectedGuestIds.length) return;
    setAction({ kind: "bulk-rsvp", status });
  }

  async function editGuest(guest: any) {
    setAction({ kind: "edit-guest", guest });
  }

  async function roomStatus(id: string, status: string) {
    setAction({ kind: "room", id, status });
  }

  async function transportStatus(item: any, status: string) {
    setAction({ kind: "transport", item, status });
  }

  async function submitAction(values: Record<string, string>) {
    if (!action) return;
    setBusy(true); setError("");
    if (action.kind === "bulk-rsvp") {
      const results = await Promise.all(selectedGuestIds.map((id) => api(`/api/guests/${id}/rsvp`, "POST", { status: action.status, evidence: values.evidence, travelDetails: "" })));
      const failed = results.filter((result) => !result.success).length;
      setGuests(guests.map((guest) => selectedGuestIds.includes(guest._id) && !results[selectedGuestIds.indexOf(guest._id)]?.success ? guest : selectedGuestIds.includes(guest._id) ? { ...guest, rsvpStatus: action.status } : guest));
      setError(failed ? `${failed} selected guest response(s) could not be updated.` : `${selectedGuestIds.length} RSVP response(s) recorded.`);
      if (!failed) setSelectedGuestIds([]);
      setBusy(false); setAction(null); router.refresh(); return;
    }
    if (action.kind === "edit-guest") {
      const result = await api(`/api/guests/${action.guest._id}`, "PUT", { name: values.name, contactNumber: values.contactNumber, email: values.email, category: values.category, groupName: values.groupName });
      setBusy(false);
      if (!result.success) { setError(result.message); return; }
      setGuests(guests.map((item) => item._id === action.guest._id ? { ...item, ...result.data } : item)); setAction(null); return;
    }
    if (action.kind === "manual") {
      const body = action.category === "rsvp"
        ? { status: action.status, evidence: values.evidence, travelDetails: "" }
        : { action: action.status, evidence: values.evidence };
      const result = await api(`/api/guests/${action.guestId}/${action.category}`, "POST", body);
      setBusy(false);
      if (!result.success) { setError(result.message); return; }
      if (action.category === "rsvp") setGuests(guests.map((guest) => guest._id === action.guestId ? { ...guest, rsvpStatus: action.status } : guest));
      setAction(null); router.refresh(); return;
    }
    if (action.kind === "room") {
      const result = await api(`/api/room-allocations/${action.id}`, "PUT", { status: action.status, notes: values.notes });
      setBusy(false);
      if (!result.success) { setError(result.message); return; }
      setRooms(rooms.map((room) => room._id === action.id ? { ...room, ...result.data } : room)); setAction(null); return;
    }
    const needsApproval = ["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(action.status);
    const result = await api(`/api/transport-schedules/${action.item._id}`, "PUT", { status: action.status, plannerApprovalReference: needsApproval ? values.reference : action.item.plannerApprovalReference || "", issue: action.status === "ISSUE_REPORTED" ? values.issue : "" });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setTransport(transport.map((row) => row._id === action.item._id ? { ...row, ...result.data } : row)); setAction(null);
  }

  const actionFields: ActionDialogField[] = action?.kind === "bulk-rsvp"
    ? [{ name: "evidence", label: "Evidence reference for these manually recorded RSVP responses", required: true, multiline: true }]
    : action?.kind === "edit-guest"
      ? [{ name: "name", label: "Guest name", required: true, defaultValue: action.guest.name }, { name: "contactNumber", label: "Phone", defaultValue: action.guest.contactNumber ?? "" }, { name: "email", label: "Email", type: "email", defaultValue: action.guest.email ?? "" }, { name: "category", label: "Guest category", defaultValue: action.guest.category ?? "" }, { name: "groupName", label: "Family / group", defaultValue: action.guest.groupName ?? "" }]
      : action?.kind === "manual"
        ? [{ name: "evidence", label: action.category === "rsvp" ? "Manual RSVP evidence reference" : "Manual invitation / reminder evidence (channel and date)", required: true, multiline: true }]
        : action?.kind === "room"
          ? [{ name: "notes", label: "Optional room note", multiline: true }]
          : action?.kind === "transport"
            ? [...(["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(action.status) ? [{ name: "reference", label: "Planner approval reference", required: true }] : []), ...(action.status === "ISSUE_REPORTED" ? [{ name: "issue", label: "Describe the transport issue", required: true, multiline: true }] : [])]
            : [];
  const actionTitle = action?.kind === "bulk-rsvp" ? `Record ${action.status === "CONFIRMED" ? "RSVP yes" : "RSVP no"} for selected guests`
    : action?.kind === "edit-guest" ? "Edit guest"
      : action?.kind === "manual" ? action.action
        : action?.kind === "room" ? `Update room status: ${action.status.toLowerCase()}`
          : action?.kind === "transport" ? `Update transport status: ${action.status.toLowerCase()}` : "";

  async function importCsv() {
    if (!csvText.trim()) return;
    setBusy(true); setError("");
    const result = await api("/api/guests/import", "POST", { eventId, csv: csvText });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setError(`Import finished: ${result.data.added} added, ${result.data.duplicates} duplicates, ${result.data.invalid.length} invalid rows.`);
    setCsvText(""); router.refresh();
  }

  async function roomSubmit(form: HTMLFormElement) {
    setBusy(true); setError(""); const formData = new FormData(form);
    const result = await api("/api/room-allocations", "POST", {
      eventId, guestId: formData.get("guestId"), hotelName: formData.get("hotelName"), roomNumber: formData.get("roomNumber"),
      roomCategory: formData.get("roomCategory"), sharingWith: formData.getAll("sharingWith"), checkInDate: formData.get("checkInDate"),
      checkOutDate: formData.get("checkOutDate"), notes: formData.get("notes"),
    });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setRooms([...rooms, result.data]); form.reset(); router.refresh();
  }

  async function transportSubmit(form: HTMLFormElement) {
    setBusy(true); setError(""); const formData = new FormData(form);
    const result = await api("/api/transport-schedules", "POST", {
      eventId, guestIds: formData.getAll("guestIds"), mode: formData.get("mode"), referenceDetails: formData.get("referenceDetails"),
      pickupAt: formData.get("pickupAt") || undefined, pickupLocation: formData.get("pickupLocation"), destination: formData.get("destination"),
      luggageDetails: formData.get("luggageDetails"), vehicle: formData.get("vehicle"), driverName: formData.get("driverName"),
      driverPhone: formData.get("driverPhone"), plannerApprovalReference: formData.get("plannerApprovalReference"), status: formData.get("status"), issue: formData.get("issue") || "",
    });
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setTransport([...transport, result.data]); form.reset(); router.refresh();
  }

  return (
    <div className="space-y-8">
      {action && <ActionDialog title={actionTitle} fields={actionFields} submitLabel={action.kind === "bulk-rsvp" ? "Record RSVP" : action.kind === "edit-guest" ? "Save guest" : action.kind === "room" ? "Update room" : action.kind === "transport" ? "Update transport" : "Record"} busy={busy} onCancel={() => setAction(null)} onSubmit={(values) => void submitAction(values)} />}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Guest list</h2><div className="flex gap-2"><a className="btn-outline" href={`/api/guests/export?eventId=${eventId}`}>Export CSV</a>{rsvpEnabled&&selectedGuestIds.length>0&&<><Button small type="button" onClick={()=>void bulkRsvp("CONFIRMED")}>Bulk RSVP yes ({selectedGuestIds.length})</Button><Button small type="button" variant="outline" onClick={()=>void bulkRsvp("DECLINED")}>Bulk RSVP no</Button></>}</div></div>
        <div className="card grid gap-3 sm:grid-cols-[1fr_180px]"><Field label="Search guests"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, contact, group" /></Field><Field label="RSVP filter"><Select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value)}><option value="">All responses</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="DECLINED">Declined</option></Select></Field></div>
        <div className="card flex flex-wrap items-end gap-3"><Field label="Import guest CSV (name required; phone/email detect duplicates)"><Input type="file" accept=".csv,text/csv" onChange={(e) => { const file = e.target.files?.[0]; if (file) void file.text().then(setCsvText); }} /></Field><Button type="button" disabled={!csvText || busy} onClick={() => void importCsv()}>{busy ? "Importing…" : "Import CSV"}</Button><a className="text-sm underline" href="data:text/csv;charset=utf-8,name,contactNumber,email,category,groupName%0A">Download CSV header example</a></div>
        <form method="post" className="card grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void guestSubmit(e.currentTarget); }}>
          <Field label="Guest name"><Input name="name" required minLength={2} /></Field><Field label="Phone"><Input name="contactNumber" /></Field><Field label="Email"><Input name="email" type="email" /></Field>
          <Field label="Category"><Input name="category" placeholder="Family, VIP, etc." /></Field><Field label="Group"><Input name="groupName" /></Field><Field label="Relationship to host"><Input name="hostRelationship" /></Field>
          <Field label="Arrival"><Input name="arrivalDate" type="date" /></Field><Field label="Departure"><Input name="departureDate" type="date" /></Field><Field label="Travel mode"><Input name="travelMode" /></Field>
          <Field label="Flight / train details"><Input name="flightTrainDetails" /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="roomRequired" />Room required</label>
          <Field label="Dietary needs"><Input name="dietaryRequirements" /></Field><Field label="Accessibility notes"><Input name="accessibilityNotes" /></Field><Field label="Special requests"><Input name="specialRequests" /></Field><Field label="Internal notes"><Input name="internalNotes" /></Field>
          <div className="sm:col-span-3"><Button disabled={busy}>{busy ? "Saving…" : "Add guest"}</Button></div>
        </form>
        {visibleGuests.length ? <div className="space-y-2">{visibleGuests.map((guest) => <article className="card flex flex-wrap items-center justify-between gap-3" key={guest._id}>
          <div className="flex items-start gap-2"><input aria-label={`Select ${guest.name}`} type="checkbox" checked={selectedGuestIds.includes(guest._id)} onChange={(e)=>setSelectedGuestIds(e.target.checked?[...selectedGuestIds,guest._id]:selectedGuestIds.filter(id=>id!==guest._id))} /><div><p className="font-medium">{guest.name}</p><p className="text-sm text-stone-600">{guest.contactNumber} · {guest.email} · {guest.category} · {guest.groupName}</p><p className="text-xs">RSVP: <Badge status={guest.rsvpStatus} />{guest.invitation && ` · Invitation ${guest.invitation.status} · ${guest.invitation.reminders?.length ?? 0} reminder(s)`} · Attendance: {guest.checkInStatus}</p>{guest.rsvpHistory?.length>0&&<details className="mt-1 text-xs"><summary className="cursor-pointer">RSVP history ({guest.rsvpHistory.length})</summary>{guest.rsvpHistory.map((record:any,i:number)=><p key={record._id??i}>{record.status} · {new Date(record.recordedAt).toLocaleString("en-IN")} · {record.evidence}</p>)}</details>}</div></div>
          <div className="flex flex-wrap gap-2"><Button small type="button" variant="outline" onClick={() => void editGuest(guest)}>Edit guest</Button>{rsvpEnabled && <><Button small type="button" variant="outline" onClick={() => setAction({ kind: "manual", guestId: guest._id, category: "rsvp", action: "Record RSVP yes", status: "CONFIRMED" })}>Record RSVP yes</Button><Button small type="button" variant="outline" onClick={() => setAction({ kind: "manual", guestId: guest._id, category: "rsvp", action: "Record RSVP no", status: "DECLINED" })}>Record RSVP no</Button><Button small type="button" onClick={() => setAction({ kind: "manual", guestId: guest._id, category: "invitation", action: "Record invitation sent", status: "SENT" })}>Record invitation sent</Button><Button small type="button" variant="outline" onClick={() => setAction({ kind: "manual", guestId: guest._id, category: "invitation", action: "Record reminder", status: "REMINDER" })}>Record reminder</Button></>}{guest.checkInStatus === "NOT_CHECKED_IN" && <Button small type="button" onClick={() => void attendance(guest._id, "CHECKED_IN")}>Check in</Button>}{guest.checkInStatus === "CHECKED_IN" && <Button small type="button" onClick={() => void attendance(guest._id, "CHECKED_OUT")}>Check out</Button>}</div>
        </article>)}</div> : <p className="text-sm text-stone-500">No guests match this search/filter.</p>}
        {!rsvpEnabled && <p className="text-xs text-stone-500">RSVP/invitation actions are disabled because the approved quotation does not include those optional services.</p>}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl">Rooming</h2><a className="btn-outline" href={`/api/room-allocations/export?eventId=${eventId}`}>Export rooming CSV</a></div>
        {unassignedGuests.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm">Room required, unassigned: {unassignedGuests.map((guest) => guest.name).join(", ")}</p>}
        <form method="post" className="card grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void roomSubmit(e.currentTarget); }}>
          <Field label="Guest"><Select name="guestId" required defaultValue=""><option value="" disabled>Select guest</option>{guests.map((guest) => <option key={guest._id} value={guest._id}>{guest.name}</option>)}</Select></Field><Field label="Hotel"><Input name="hotelName" required /></Field><Field label="Room number"><Input name="roomNumber" /></Field><Field label="Category"><Input name="roomCategory" /></Field><Field label="Check in"><Input name="checkInDate" type="date" required /></Field><Field label="Check out"><Input name="checkOutDate" type="date" required /></Field>
          <label className="sm:col-span-3 text-xs text-stone-600">Share with (choose guests only when room sharing is agreed)<Select name="sharingWith" multiple className="min-h-24">{guests.map((guest) => <option key={guest._id} value={guest._id}>{guest.name}</option>)}</Select></label><Field label="Notes"><Input name="notes" /></Field><div><Button disabled={busy || !guests.length}>{busy ? "Saving…" : "Allocate room"}</Button></div>
        </form>
        {rooms.map((room) => <article className="card flex flex-wrap items-center justify-between gap-2 text-sm" key={room._id}><span>{room.guestId?.name} · {room.hotelName} {room.roomNumber} · {new Date(room.checkInDate).toLocaleDateString("en-IN")}–{new Date(room.checkOutDate).toLocaleDateString("en-IN")} · {room.status}</span><div className="flex gap-2">{room.status === "ASSIGNED" && <Button small type="button" onClick={() => void roomStatus(room._id, "CHECKED_IN")}>Check in</Button>}{room.status === "CHECKED_IN" && <Button small type="button" onClick={() => void roomStatus(room._id, "CHECKED_OUT")}>Check out</Button>}{["ASSIGNED", "CHECKED_IN"].includes(room.status) && <Button small type="button" variant="outline" onClick={() => void roomStatus(room._id, "CANCELLED")}>Cancel</Button>}</div></article>)}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl">Transport</h2><a className="btn-outline" href={`/api/transport-schedules/export?eventId=${eventId}`}>Export transport CSV</a></div>
        <form method="post" className="card grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void transportSubmit(e.currentTarget); }}>
          <label className="sm:col-span-3 text-xs text-stone-600">Guests (multi-select)<Select name="guestIds" multiple required className="min-h-24">{guests.map((guest) => <option key={guest._id} value={guest._id}>{guest.name}</option>)}</Select></label>
          <Field label="Mode"><Select name="mode"><option value="FLIGHT">Flight</option><option value="TRAIN">Train</option><option value="BUS">Bus</option><option value="OTHER">Other</option></Select></Field><Field label="Travel reference"><Input name="referenceDetails" /></Field><Field label="Pickup date/time"><Input name="pickupAt" type="datetime-local" /></Field>
          <Field label="Pickup location"><Input name="pickupLocation" /></Field><Field label="Destination"><Input name="destination" /></Field><Field label="Luggage"><Input name="luggageDetails" /></Field><Field label="Vehicle"><Input name="vehicle" /></Field><Field label="Driver"><Input name="driverName" /></Field><Field label="Driver phone"><Input name="driverPhone" /></Field><Field label="Planner approval reference"><Input name="plannerApprovalReference" /></Field>
          <Field label="Status"><Select name="status"><option value="PLANNED">Planned</option><option value="APPROVAL_PENDING">Approval pending</option><option value="APPROVED">Approved</option><option value="ASSIGNED">Assigned</option></Select></Field><div className="sm:col-span-3"><Button disabled={busy || !guests.length}>{busy ? "Saving…" : "Add transport schedule"}</Button></div>
        </form>
        {transport.map((item) => <article className="card flex flex-wrap items-center justify-between gap-2 text-sm" key={item._id}><span>{item.mode} · {item.pickupLocation} → {item.destination} · {item.status}{item.guestIds?.length ? ` · ${item.guestIds.map((guest: any) => guest.name).join(", ")}` : ""}{item.issue && <span className="block text-rose-700">Issue: {item.issue}</span>}</span><div className="flex gap-2">{item.status === "PLANNED" && <Button small type="button" variant="outline" onClick={() => void transportStatus(item, "APPROVAL_PENDING")}>Request approval</Button>}{item.status === "APPROVAL_PENDING" && <Button small type="button" onClick={() => void transportStatus(item, "APPROVED")}>Record approval</Button>}{item.status === "APPROVED" && <Button small type="button" onClick={() => void transportStatus(item, "ASSIGNED")}>Assign vehicle</Button>}{item.status === "ASSIGNED" && <Button small type="button" onClick={() => void transportStatus(item, "IN_PROGRESS")}>Start</Button>}{["ASSIGNED", "IN_PROGRESS"].includes(item.status) && <Button small type="button" variant="outline" onClick={() => void transportStatus(item, "ISSUE_REPORTED")}>Report issue</Button>}{item.status === "IN_PROGRESS" && <Button small type="button" onClick={() => void transportStatus(item, "COMPLETED")}>Complete</Button>}{item.status === "ISSUE_REPORTED" && <Button small type="button" onClick={() => void transportStatus(item, "ASSIGNED")}>Resolve & assign</Button>}{["PLANNED", "APPROVAL_PENDING", "APPROVED", "ASSIGNED"].includes(item.status) && <Button small type="button" variant="outline" onClick={() => void transportStatus(item, "CANCELLED")}>Cancel</Button>}</div></article>)}
      </section>
    </div>
  );
}
