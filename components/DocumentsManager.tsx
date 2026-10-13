"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { DOCUMENT_LABEL, DOCUMENT_TYPES, SINGLE_DOCUMENT_TYPES } from "@/lib/constants";
import { Card, Loader } from "@/components/ui";
import { FileLink, fileUrl } from "@/components/FileLink";

export function DocumentsManager({ profile }: { profile: any }) {
  const [photo, setPhoto] = useState(profile.profilePhoto ?? profile.documents?.find((d: any) => d.documentType === "PASSPORT_PHOTO") ?? null);
  const [docs, setDocs] = useState<any[]>(profile.documents ?? []);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(type: string, file?: File) {
    if (!file) return;
    setBusy(type); setNotice(null);
    const form = new FormData(); form.set("file", file); form.set("documentType", type);
    const res = await api("/api/candidates/documents", "POST", form);
    setBusy(""); setNotice({ ok: res.success, text: res.message });
    if (res.success) { setPhoto(res.data.profilePhoto); setDocs(res.data.documents); }
  }

  async function remove(publicId: string) {
    setBusy(publicId); setNotice(null);
    const res = await api("/api/candidates/documents", "DELETE", { publicId });
    setBusy(""); setNotice({ ok: res.success, text: res.message });
    if (res.success) setDocs(res.data.documents);
  }

  return <div className="documents-flow space-y-4">
    {notice && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{notice.text}</p>}
    <Card>
      <h2 className="text-lg">Passport size photo <span className="text-xs font-normal text-stone-500">Required to apply</span></h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {photo ? <img src={fileUrl(photo)} alt="Your passport size photo" className="h-20 w-20 rounded-full object-cover ring-2 ring-forest-100" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-forest-50 text-xs text-stone-600">No photo</div>}
        <label className="btn-outline min-h-11 cursor-pointer">{busy === "PROFILE_PHOTO" && <Loader />}{photo ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload("PROFILE_PHOTO", e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
        <span className="text-xs text-stone-500">JPG, PNG or WEBP · up to 3 MB</span>
      </div>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2">
      {DOCUMENT_TYPES.filter((type) => type !== "PASSPORT_PHOTO").map((type) => {
        const mine = docs.filter((d) => d.documentType === type);
        return <Card key={type} className="p-4">
          <h2 className="font-semibold">{DOCUMENT_LABEL[type]}</h2>
          {type === "SIGNATURE" && <p className="mt-1 text-xs text-stone-500">PDF or image, up to 5 MB.</p>}
          <ul className="mt-3 space-y-2 text-sm">
            {mine.map((doc) => <li key={doc.publicId} className="flex items-center justify-between gap-2"><FileLink f={doc} /><button type="button" className="min-h-10 px-2 text-xs text-rose-700 underline disabled:opacity-50" disabled={busy === doc.publicId} onClick={() => void remove(doc.publicId)}>Delete</button></li>)}
            {!mine.length && <li className="text-sm text-stone-500">Not uploaded</li>}
          </ul>
          <label className="btn-outline btn-sm mt-3 min-h-10 cursor-pointer">{busy === type && <Loader />}{SINGLE_DOCUMENT_TYPES.includes(type) && mine.length ? "Replace file" : "Upload file"}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload(type, e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
        </Card>;
      })}
    </div>
    <p className="text-xs text-stone-500">Files are stored privately. Only you and the hiring team can open them. Documents may be PDF, JPG, PNG or WEBP up to 5 MB.</p>
  </div>;
}
