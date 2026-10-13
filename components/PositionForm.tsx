"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, lines, csv } from "@/lib/client";
import { DOCUMENT_LABEL, DOCUMENT_TYPES, EMPLOYMENT_LABEL, EMPLOYMENT_TYPES, MANDATORY_POSITION_DOCUMENTS, POSITION_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { Button, Card, Field, Input, Loader, Select, Textarea } from "./ui";

export function PositionForm({ position }: { position?: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const p = position ?? {};

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    const fd = new FormData(e.currentTarget);
    const f = Object.fromEntries(fd) as Record<string, string>;
    const body = {
      title: f.title, description: f.description, responsibilities: lines(f.responsibilities), requirements: lines(f.requirements), skills: csv(f.skills), location: f.location,
      employmentType: f.employmentType, experienceRequired: f.experienceRequired, compensation: f.compensation, openings: f.openings, applicationDeadline: f.applicationDeadline,
      requiredDocuments: fd.getAll("requiredDocuments"), status: f.status,
    };
    const res = position ? await api(`/api/positions/${p._id}`, "PUT", body) : await api("/api/positions", "POST", body);
    if (!res.success) { setBusy(false); setError(res.message); setErrors(res.errors ?? {}); return; }
    router.push("/admin/positions"); router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <Card className="space-y-4">
        <Field label="Title" error={errors.title}><Input name="title" defaultValue={p.title} required /></Field>
        <Field label="Description" error={errors.description}><Textarea name="description" defaultValue={p.description} rows={5} required /></Field>
        <Field label="Responsibilities" hint="One per line"><Textarea name="responsibilities" defaultValue={(p.responsibilities ?? []).join("\n")} /></Field>
        <Field label="Requirements" hint="One per line"><Textarea name="requirements" defaultValue={(p.requirements ?? []).join("\n")} /></Field>
        <Field label="Skills" hint="Separate with commas"><Input name="skills" defaultValue={(p.skills ?? []).join(", ")} /></Field>
      </Card>
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" error={errors.location}><Input name="location" defaultValue={p.location} required /></Field>
        <Field label="Employment type"><Select name="employmentType" defaultValue={p.employmentType ?? "FULL_TIME"}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}</Select></Field>
        <Field label="Experience required"><Input name="experienceRequired" defaultValue={p.experienceRequired} placeholder="e.g. 1+ year, or leave empty for freshers" /></Field>
        <Field label="Compensation"><Input name="compensation" defaultValue={p.compensation} placeholder="Optional" /></Field>
        <Field label="Openings" error={errors.openings}><Input name="openings" type="number" min={1} defaultValue={p.openings ?? 1} required /></Field>
        <Field label="Application deadline"><Input name="applicationDeadline" type="date" defaultValue={p.applicationDeadline ? String(p.applicationDeadline).slice(0, 10) : ""} /></Field>
        <Field label="Status"><Select name="status" defaultValue={p.status ?? "ACTIVE"}>{POSITION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select></Field>
        <fieldset className="sm:col-span-2">
          <legend className="label">Documents required to apply</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {DOCUMENT_TYPES.map((d) => MANDATORY_POSITION_DOCUMENTS.includes(d) ? (
              <label key={d} className="flex items-center gap-2">
                <input type="checkbox" defaultChecked disabled />
                <input type="hidden" name="requiredDocuments" value={d} />
                {DOCUMENT_LABEL[d]} <span className="text-xs text-rose-700">(Required)</span>
              </label>
            ) : (
              <label key={d} className="flex items-center gap-2"><input type="checkbox" name="requiredDocuments" value={d} defaultChecked={p.requiredDocuments?.includes(d)} />{DOCUMENT_LABEL[d]}</label>
            ))}
          </div>
        </fieldset>
      </Card>
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy && <Loader />}{position ? "Save changes" : "Create position"}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
    </form>
  );
}
