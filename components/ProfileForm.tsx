"use client";
import { useState } from "react";
import { api, csv } from "@/lib/client";
import { DOCUMENT_LABEL, DOCUMENT_TYPES, SINGLE_DOCUMENT_TYPES } from "@/lib/constants";
import { Button, Card, Field, Input, Loader, Select, Textarea } from "./ui";
import { FileLink, fileUrl } from "./FileLink";

export function ProfileForm({ user, profile, completion }: { user: any; profile: any; completion: { percent: number; missing: string[] } }) {
  const [percent, setPercent] = useState(completion.percent);
  const legacyPassportPhoto = (profile.documents ?? []).find((d: any) => d.documentType === "PASSPORT_PHOTO");
  const [photo, setPhoto] = useState(profile.profilePhoto ?? legacyPassportPhoto ?? null);
  const [docs, setDocs] = useState<any[]>(profile.documents ?? []);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("save"); setMsg(null); setErrors({});
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = await api("/api/candidates/profile", "PUT", {
      name: f.name, phone: f.phone, dateOfBirth: f.dateOfBirth, gender: f.gender, address: f.address, city: f.city, state: f.state, country: f.country,
      postalCode: f.postalCode, skills: csv(f.skills), languages: csv(f.languages), experience: f.experience, yearsOfExperience: f.yearsOfExperience || 0,
      availability: f.availability, emergencyContact: { name: f.ecName, phone: f.ecPhone, relation: f.ecRelation },
    });
    setBusy("");
    setMsg({ ok: res.success, text: res.message });
    setErrors(res.errors ?? {});
    if (res.success) setPercent(res.data.completion.percent);
  }

  async function upload(type: string, file?: File | null) {
    if (!file) return;
    setBusy(type); setMsg(null);
    const fd = new FormData(); fd.set("file", file); fd.set("documentType", type);
    const res = await api("/api/candidates/documents", "POST", fd);
    setBusy("");
    setMsg({ ok: res.success, text: res.message });
    if (res.success) { setPhoto(res.data.profilePhoto); setDocs(res.data.documents); setPercent((p) => Math.min(100, p + 5)); }
  }

  async function remove(publicId: string) {
    setBusy(publicId);
    const res = await api("/api/candidates/documents", "DELETE", { publicId });
    setBusy("");
    setMsg({ ok: res.success, text: res.message });
    if (res.success) setDocs(res.data.documents);
  }

  const p = profile;
  const dob = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : "";
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-xl">Profile completion</h2><span className="font-serif text-2xl">{percent}%</span></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full bg-forest-600 transition-all" style={{ width: `${percent}%` }} /></div>
      </Card>

      {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}

      <Card>
        <h2 className="mb-4 text-xl">Photo and documents</h2>
        <p className="mb-3 text-sm font-medium text-forest-900">Passport-size photo <span className="text-rose-700">(required to apply)</span></p>
        <div className="flex flex-wrap items-center gap-4">
          {photo ? <img src={fileUrl(photo)} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover ring-2 ring-gold-300" /> : <div className="grid h-24 w-24 place-items-center rounded-full bg-forest-100 text-xs text-forest-700">No photo</div>}
          <label className="btn-outline cursor-pointer">
            {busy === "PROFILE_PHOTO" ? <Loader /> : null}{photo ? "Replace passport-size photo" : "Upload passport-size photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload("PROFILE_PHOTO", e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <span className="text-xs text-stone-500">Clear JPG, PNG or WEBP image, up to 3 MB</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {DOCUMENT_TYPES.filter((t) => t !== "PASSPORT_PHOTO").map((t) => {
            const mine = docs.filter((d) => d.documentType === t);
            return (
              <div key={t} className="rounded-md border border-forest-100 p-3">
                <p className="text-sm font-medium text-forest-900">{DOCUMENT_LABEL[t]}</p>
                {t === "SIGNATURE" && <p className="mt-1 text-xs text-stone-500">Upload your signature document as a PDF, JPG, PNG or WEBP, up to 5 MB.</p>}
                <ul className="my-2 space-y-1 text-sm">
                  {mine.map((d) => (
                    <li key={d.publicId} className="flex items-center justify-between gap-2"><FileLink f={d} />
                      <button type="button" className="text-xs text-rose-700 underline disabled:opacity-50" disabled={busy === d.publicId} onClick={() => remove(d.publicId)}>Delete</button></li>
                  ))}
                  {!mine.length && <li className="text-stone-500">Not uploaded</li>}
                </ul>
                <label className="btn-outline btn-sm cursor-pointer">
                  {busy === t && <Loader />}{SINGLE_DOCUMENT_TYPES.includes(t) && mine.length ? "Replace" : "Upload"}
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(t, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">PDF, JPG, PNG or WEBP, up to 5 MB each. Only you and our hiring team can open your files.</p>
      </Card>

      <form onSubmit={save} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="text-xl">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}><Input name="name" defaultValue={user.name} required /></Field>
            <Field label="Email" hint="Email cannot be changed"><Input value={user.email} disabled readOnly /></Field>
            <Field label="Phone" error={errors.phone}><Input name="phone" type="tel" defaultValue={user.phone} required /></Field>
            <Field label="Date of birth"><Input name="dateOfBirth" type="date" defaultValue={dob} /></Field>
            <Field label="Gender"><Select name="gender" defaultValue={p.gender ?? ""}><option value="">Prefer not to say</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></Select></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-xl">Address</h2>
          <Field label="Street address"><Input name="address" defaultValue={p.address} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City"><Input name="city" defaultValue={p.city} /></Field>
            <Field label="State"><Input name="state" defaultValue={p.state} /></Field>
            <Field label="Country"><Input name="country" defaultValue={p.country} /></Field>
            <Field label="Postal code"><Input name="postalCode" defaultValue={p.postalCode} /></Field>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-xl">Work</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Skills" hint="Separate with commas"><Input name="skills" defaultValue={(p.skills ?? []).join(", ")} /></Field>
            <Field label="Languages" hint="Separate with commas"><Input name="languages" defaultValue={(p.languages ?? []).join(", ")} /></Field>
            <Field label="Years of experience"><Input name="yearsOfExperience" type="number" min={0} max={60} defaultValue={p.yearsOfExperience ?? 0} /></Field>
            <Field label="Availability" hint="For example: weekends and evenings"><Input name="availability" defaultValue={p.availability} /></Field>
          </div>
          <Field label="Experience"><Textarea name="experience" defaultValue={p.experience} placeholder="Where you have worked and what you did" /></Field>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-xl">Emergency contact</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name"><Input name="ecName" defaultValue={p.emergencyContact?.name} /></Field>
            <Field label="Phone"><Input name="ecPhone" type="tel" defaultValue={p.emergencyContact?.phone} /></Field>
            <Field label="Relationship"><Input name="ecRelation" defaultValue={p.emergencyContact?.relation} /></Field>
          </div>
        </Card>
        <Button type="submit" disabled={busy === "save"}>{busy === "save" && <Loader />}Save profile</Button>
      </form>
    </div>
  );
}
