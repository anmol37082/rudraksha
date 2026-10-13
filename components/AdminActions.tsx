"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { TRANSITIONS } from "@/lib/transitions";
import { Modal } from "./Modal";
import { Button, Field, Input, Loader, Select, Textarea } from "./ui";

const ACTION_LABEL: Record<string, string> = { UNDER_REVIEW: "Mark under review", SHORTLISTED: "Shortlist", REJECTED: "Reject", INTERVIEWED: "Mark interviewed", SELECTED: "Select" };

export function AdminActions({ app }: { app: { _id: string; status: string; adminNotes: string; hasStaff: boolean } }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState(app.adminNotes);
  const [showIv, setShowIv] = useState(false);
  const [showStaff, setShowStaff] = useState(false);

  async function run(fn: () => ReturnType<typeof api>) {
    setBusy(true); setMsg(null);
    const res = await fn();
    setBusy(false); setMsg({ ok: res.success, text: res.message });
    if (res.success) { setPending(null); setComment(""); setShowIv(false); setShowStaff(false); router.refresh(); }
  }

  const moves = (TRANSITIONS[app.status] ?? []).filter((s) => ACTION_LABEL[s]);
  const canSchedule = ["SHORTLISTED", "INTERVIEW_SCHEDULED"].includes(app.status);

  return (
    <div className="space-y-5">
      {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        {moves.map((s) => <Button key={s} small variant={s === "REJECTED" ? "danger" : "primary"} onClick={() => setPending(s)}>{ACTION_LABEL[s]}</Button>)}
        {canSchedule && <Button small variant="gold" onClick={() => setShowIv(true)}>{app.status === "INTERVIEW_SCHEDULED" ? "Reschedule interview" : "Schedule interview"}</Button>}
        {app.status === "SELECTED" && !app.hasStaff && <Button small variant="gold" onClick={() => setShowStaff(true)}>Convert to permanent staff</Button>}
        {!moves.length && !canSchedule && !(app.status === "SELECTED" && !app.hasStaff) && <p className="text-sm text-stone-600">No further actions for this application.</p>}
      </div>

      <div>
        <Field label="Private admin notes (never shown to the candidate)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} /></Field>
        <Button small variant="outline" className="mt-2" disabled={busy || notes === app.adminNotes} onClick={() => run(() => api(`/api/applications/${app._id}`, "PUT", { adminNotes: notes }))}>Save notes</Button>
      </div>

      <Modal open={!!pending} title={pending ? ACTION_LABEL[pending] : ""} onClose={() => setPending(null)}>
        <Field label="Comment (optional, for the history)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
          <Button variant={pending === "REJECTED" ? "danger" : "primary"} disabled={busy} onClick={() => run(() => api(`/api/applications/${app._id}`, "PUT", { status: pending, comment }))}>{busy && <Loader />}Confirm</Button>
        </div>
      </Modal>

      <Modal open={showIv} title="Schedule interview" onClose={() => setShowIv(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); run(() => api("/api/interviews", "POST", { ...f, applicationId: app._id })); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Time"><Input name="time" type="time" required /></Field>
          </div>
          <Field label="Type"><Select name="type" defaultValue="IN_PERSON">{INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toLowerCase()}</option>)}</Select></Field>
          <Field label="Location (in-person)"><Input name="location" /></Field>
          <Field label="Meeting link (video)"><Input name="meetingLink" type="url" placeholder="https://" /></Field>
          <Field label="Interviewer"><Input name="interviewer" /></Field>
          <Field label="Instructions for the candidate"><Textarea name="instructions" rows={3} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowIv(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader />}Schedule</Button></div>
        </form>
      </Modal>

      <Modal open={showStaff} title="Convert to permanent staff" onClose={() => setShowStaff(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); run(() => api("/api/admin/staff", "POST", { ...f, applicationId: app._id })); }}>
          <Field label="Joining date"><Input name="joiningDate" type="date" required /></Field>
          <Field label="Notes"><Textarea name="notes" rows={3} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowStaff(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader />}Create staff record</Button></div>
        </form>
      </Modal>
    </div>
  );
}
