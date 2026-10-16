"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, csv } from "@/lib/client";
import { DOCUMENT_LABEL, DOCUMENT_TYPES, SINGLE_DOCUMENT_TYPES } from "@/lib/constants";
import { Button, Card, Field, Input, LinkButton, Loader, Select, Textarea } from "./ui";
import { FileLink, fileUrl } from "./FileLink";
import styles from "./ProfileForm.module.css";

function ProfileSectionIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "contact") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M7 3.5h3l1.5 4-2 1.5a14 14 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2C10.5 18.2 5.8 13.5 5 5.7A2 2 0 0 1 7 3.5Z" /></svg>;
  if (name === "address") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
  if (name === "work") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V5h6v2M4 12h16m-10 0v2h4v-2" /></svg>;
  if (name === "availability") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3v4m8-4v4M3.5 9.5h17M8 13h2m4 0h2M8 17h2" /></svg>;
  if (name === "emergency") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0M18 5l2 2m0-2-2 2" /></svg>;
  if (name === "skills") return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="m12 3 1.5 2.2 2.7-.2.7 2.6 2.4 1.3-.8 2.6.8 2.6-2.4 1.3-.7 2.6-2.7-.2L12 20l-1.5-2.2-2.7.2-.7-2.6-2.4-1.3.8-2.6-.8-2.6 2.4-1.3.7-2.6 2.7.2L12 3Z" /><circle cx="12" cy="11.5" r="2.5" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
}

export function ProfileForm({ user, profile, setupComplete, completion }: { user: any; profile: any; setupComplete: boolean; completion: { percent: number; missing: string[] } }) {
  const router = useRouter();
  const [percent, setPercent] = useState(completion.percent);
  const [saved, setSaved] = useState(setupComplete);
  const [editing, setEditing] = useState(!setupComplete);
  const legacyPassportPhoto = (profile.documents ?? []).find((d: any) => d.documentType === "PASSPORT_PHOTO");
  const [photo, setPhoto] = useState(profile.profilePhoto ?? legacyPassportPhoto ?? null);
  const [docs, setDocs] = useState<any[]>(profile.documents ?? []);
  const [busy, setBusy] = useState("");
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:invalid, select:invalid, textarea:invalid");
    if (invalid) {
      const section = invalid.closest<HTMLElement>("[data-profile-step]");
      if (section) setStep(Number(section.dataset.profileStep));
      requestAnimationFrame(() => invalid.reportValidity());
      return;
    }
    setBusy("save"); setMsg(null); setErrors({});
    const f = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const res = await api("/api/candidates/profile", "PUT", {
      name: f.name, phone: f.phone, dateOfBirth: f.dateOfBirth, gender: f.gender, address: f.address, city: f.city, state: f.state, country: f.country,
      postalCode: f.postalCode, skills: csv(f.skills), languages: csv(f.languages), experience: f.experience, yearsOfExperience: f.yearsOfExperience || 0,
      availability: f.availability, emergencyContact: { name: f.ecName, phone: f.ecPhone, relation: f.ecRelation },
    });
    setBusy("");
    setMsg({ ok: res.success, text: res.message });
    setErrors(res.errors ?? {});
    if (res.success) {
      setPercent(res.data.completion.percent);
      setSaved(true);
      setEditing(false);
      router.replace("/candidate/dashboard");
      router.refresh();
    }
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
  const steps = ["Personal details", "Address", "Work", "Emergency contact"];
  const details = [
    ["Full name", user.name], ["Email", user.email], ["Phone", user.phone],
    ["Date of birth", dob || "Not provided"], ["Gender", p.gender || "Prefer not to say"],
    ["Address", [p.address, p.city, p.state, p.country, p.postalCode].filter(Boolean).join(", ") || "Not provided"],
    ["Skills", p.skills?.join(", ") || "Not provided"], ["Languages", p.languages?.join(", ") || "Not provided"],
    ["Experience", p.experience || `${p.yearsOfExperience ?? 0} years`], ["Availability", p.availability || "Not provided"],
    ["Emergency contact", p.emergencyContact?.name ? `${p.emergencyContact.name} · ${p.emergencyContact.phone ?? ""} · ${p.emergencyContact.relation ?? ""}` : "Not provided"],
  ];

  function editAt(targetStep: number) {
    setStep(targetStep);
    setEditing(true);
  }

  if (saved && !editing) return (
    <>
    <div className={`${styles.savedDesktop} space-y-6`}>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-xl">Profile details</h2><p className="mt-1 text-sm text-stone-600">Your profile is saved. You can edit these details anytime.</p></div>
          <Button type="button" onClick={() => setEditing(true)}>Edit profile</Button>
        </div>
        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {details.map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-sm text-forest-900">{value}</dd></div>)}
        </dl>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg">Profile completion</h2><p className="mt-1 text-sm text-stone-600">{percent}% complete</p></div><LinkButton variant="outline" href="/candidate/documents">Manage documents</LinkButton></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full bg-forest-600" style={{ width: `${percent}%` }} /></div>
      </Card>
      {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
    </div>
    <div className={styles.savedMobile}>
      <header className={styles.mobileHeading}><h1>My Profile</h1><p>Your profile is saved. You can edit<br />these details anytime.</p></header>
      <section className={styles.mobileSummary}>
        <label className={styles.mobilePhoto} aria-label="Upload profile photo">
          {photo ? <img src={fileUrl(photo)} alt="Your profile" /> : <span className={styles.mobileAvatar}><ProfileSectionIcon name="profile" /></span>}
          <span className={styles.photoCamera} aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 6h3l1.2-1.5h5.6L14 6h3v9H3z"/><circle cx="10" cy="10.5" r="2.5" /></svg></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { upload("PROFILE_PHOTO", event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        <div className={styles.mobileSummaryDetails}>
          <strong>{user.name}</strong><small>CANDIDATE</small>
          <div className={styles.mobileProgress}><span><i style={{ width: `${percent}%` }} /></span><b>{percent}%</b></div>
          <p>Complete your profile to get better opportunities</p>
        </div>
        <button type="button" className={styles.mobileEditMain} onClick={() => editAt(0)}>✎ Edit Profile</button>
      </section>

      {[
        { title: "Personal Information", icon: "profile", step: 0, rows: [["FULL NAME", user.name], ["GENDER", p.gender ? `${p.gender[0]}${p.gender.slice(1).toLowerCase()}` : "Not provided"], ["DATE OF BIRTH", dob || "Not provided"]] },
        { title: "Contact Details", icon: "contact", step: 0, rows: [["EMAIL", user.email], ["PHONE", user.phone]] },
        { title: "Address", icon: "address", step: 1, rows: [["ADDRESS", [p.address, p.city, p.state, p.country, p.postalCode].filter(Boolean).join(", ") || "Not provided"]] },
        { title: "Skills & Languages", icon: "skills", step: 2, rows: [["SKILLS", p.skills?.join(", ") || "Not provided"], ["LANGUAGES", p.languages?.join(", ") || "Not provided"]] },
        { title: "Experience", icon: "work", step: 2, rows: [["EXPERIENCE", p.experience || `${p.yearsOfExperience ?? 0} years`]] },
        { title: "Availability", icon: "availability", step: 2, rows: [["AVAILABILITY", p.availability || "Not provided"]] },
        { title: "Emergency Contact", icon: "emergency", step: 3, rows: [["NAME", p.emergencyContact?.name || "Not provided"], ["PHONE", p.emergencyContact?.phone || "Not provided"], ["RELATIONSHIP", p.emergencyContact?.relation || "Not provided"]] },
      ].map((group) => <section key={group.title} className={styles.mobileGroup}>
        <span className={styles.mobileGroupIcon}><ProfileSectionIcon name={group.icon} /></span>
        <div className={styles.mobileGroupContent}>
          <div className={styles.mobileGroupHeading}><h2>{group.title}</h2><button type="button" onClick={() => editAt(group.step)}>✎ Edit</button></div>
          <dl className={`${styles.mobileGroupRows} ${group.rows.length === 1 ? styles.oneColumn : ""}`}>
            {group.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
      </section>)}

      <section className={styles.mobileUpdate}>
        <span aria-hidden="true">▤</span>
        <div><strong>Keep your profile updated</strong><p>A complete profile helps you get more opportunities.</p></div>
        <button type="button" onClick={() => editAt(0)}>Update Now <span aria-hidden="true">→</span></button>
      </section>
      {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
    </div>
    </>
  );

  function nextStep() {
    const section = document.querySelector<HTMLElement>(`[data-profile-step="${step}"]`);
    const invalid = section?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input:invalid, select:invalid, textarea:invalid");
    if (invalid) { invalid.reportValidity(); return; }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <div className={`${styles.profileFlow} space-y-6`}>
      {saved && editing && <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel editing</Button>}
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-xl">Profile completion</h2><span className="font-serif text-2xl">{percent}%</span></div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full bg-forest-600 transition-all" style={{ width: `${percent}%` }} /></div>
      </Card>

      {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}

      <Card className="hidden sm:block">
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

      <div className="sm:hidden">
        <LinkButton href="/candidate/documents" className="w-full">Manage my documents</LinkButton>
      </div>

      <form onSubmit={save} noValidate className={`${styles.profileWizard} space-y-4 sm:space-y-6`}>
        <Card className="sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-forest-900">Step {step + 1} of {steps.length}</p>
            <p className="text-xs text-stone-600">{steps[step]}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
            <div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </Card>
        <Card className={`space-y-4 ${step === 0 ? "" : "hidden sm:block"}`} data-profile-step="0">
          <h2 className="text-xl">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}><Input name="name" defaultValue={user.name} required /></Field>
            <Field label="Email" hint="Email cannot be changed"><Input value={user.email} disabled readOnly /></Field>
            <Field label="Phone" error={errors.phone}><Input name="phone" type="tel" defaultValue={user.phone} required /></Field>
          <Field label="Date of birth" error={errors.dateOfBirth}><Input name="dateOfBirth" type="date" defaultValue={dob} required /></Field>
            <Field label="Gender"><Select name="gender" defaultValue={p.gender ?? ""}><option value="">Prefer not to say</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></Select></Field>
          </div>
        </Card>
        <Card className={`space-y-4 ${step === 1 ? "" : "hidden sm:block"}`} data-profile-step="1">
          <h2 className="text-xl">Address</h2>
          <Field label="Street address" error={errors.address}><Input name="address" defaultValue={p.address} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" error={errors.city}><Input name="city" defaultValue={p.city} required /></Field>
            <Field label="State" error={errors.state}><Input name="state" defaultValue={p.state} required /></Field>
            <Field label="Country" error={errors.country}><Input name="country" defaultValue={p.country} required /></Field>
            <Field label="Postal code" error={errors.postalCode}><Input name="postalCode" defaultValue={p.postalCode} required /></Field>
          </div>
        </Card>
        <Card className={`space-y-4 ${step === 2 ? "" : "hidden sm:block"}`} data-profile-step="2">
          <h2 className="text-xl">Work</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Skills" error={errors.skills} hint="Separate with commas"><Input name="skills" defaultValue={(p.skills ?? []).join(", ")} required /></Field>
            <Field label="Languages" error={errors.languages} hint="Separate with commas"><Input name="languages" defaultValue={(p.languages ?? []).join(", ")} required /></Field>
            <Field label="Years of experience"><Input name="yearsOfExperience" type="number" min={0} max={60} defaultValue={p.yearsOfExperience ?? 0} /></Field>
            <Field label="Availability" error={errors.availability} hint="For example: weekends and evenings"><Input name="availability" defaultValue={p.availability} required /></Field>
          </div>
          <Field label="Experience" error={errors.experience} hint="If you are new, enter “No prior experience”."><Textarea name="experience" defaultValue={p.experience} placeholder="Where you have worked and what you did" required /></Field>
        </Card>
        <Card className={`space-y-4 ${step === 3 ? "" : "hidden sm:block"}`} data-profile-step="3">
          <h2 className="text-xl">Emergency contact</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name"><Input name="ecName" defaultValue={p.emergencyContact?.name} required /></Field>
            <Field label="Phone"><Input name="ecPhone" type="tel" defaultValue={p.emergencyContact?.phone} required pattern="\\+?[0-9\\s-]{7,18}" /></Field>
            <Field label="Relationship"><Input name="ecRelation" defaultValue={p.emergencyContact?.relation} required /></Field>
          </div>
        </Card>
        <div className="hidden sm:block">
          <Button type="submit" disabled={busy === "save"}>{busy === "save" && <Loader />}Save profile</Button>
        </div>
        <div className="flex gap-3 sm:hidden">
          {step > 0 && <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((current) => Math.max(current - 1, 0))}>Back</Button>}
          {step < steps.length - 1
            ? <Button type="button" className="flex-1" onClick={nextStep}>Next step</Button>
            : <Button type="submit" className="flex-1" disabled={busy === "save"}>{busy === "save" && <Loader />}Save profile</Button>}
        </div>
      </form>
    </div>
  );
}
