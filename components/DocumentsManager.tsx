"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { DOCUMENT_LABEL, DOCUMENT_TYPES, SINGLE_DOCUMENT_TYPES } from "@/lib/constants";
import { Button, Card, Loader } from "@/components/ui";
import { FileLink, fileUrl } from "@/components/FileLink";
import styles from "./DocumentsManager.module.css";

function DocumentIcon({ person = false }: { person?: boolean }) {
  return person
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6m-6 4h6"/></svg>;
}

export function DocumentsManager({ profile }: { profile: any }) {
  const router = useRouter();
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

  return <div className={styles.flow}>
    {notice && <p role="status" className={`${styles.notice} ${notice.ok ? styles.success : styles.error}`}>{notice.text}</p>}
    <Card className={`documents-photo-card ${styles.photoCard}`}>
      <div className={styles.cardHeading}><span className={styles.icon}><DocumentIcon person /></span><div><h2>Passport size photo <b>*</b></h2><p>Required to apply</p></div></div>
      <div className={styles.photoRow}>
        {photo ? <img src={fileUrl(photo)} alt="Your passport size photo" className={styles.photoPreview} /> : <div className={styles.photoPlaceholder}>No photo</div>}
        <div className={styles.photoActions}><label className={`${styles.uploadButton} ${styles.outline}`}>{busy === "PROFILE_PHOTO" && <Loader />}{photo ? "Replace photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload("PROFILE_PHOTO", e.target.files?.[0]); e.currentTarget.value = ""; }} /></label><small>JPG, PNG or WEBP · up to 3 MB</small></div>
      </div>
    </Card>

    <div className={styles.grid}>
      {DOCUMENT_TYPES.filter((type) => type !== "PASSPORT_PHOTO").map((type) => {
        const mine = docs.filter((d) => d.documentType === type);
        return <Card key={type} className={`documents-item-card ${styles.itemCard}`}>
          <div className={styles.cardHeading}><span className={styles.icon}><DocumentIcon /></span><h2>{DOCUMENT_LABEL[type]}</h2></div>
          {type === "SIGNATURE" && <p className={styles.helper}>PDF or image, up to 5 MB.</p>}
          <ul className={styles.fileList}>
            {mine.map((doc) => <li key={doc.publicId}><FileLink f={doc} /><span className={styles.fileActions}><label className={`${styles.uploadButton} ${styles.outline}`}>{busy === type && <Loader />}Replace file<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload(type, e.target.files?.[0]); e.currentTarget.value = ""; }} /></label><button type="button" className={styles.delete} disabled={busy === doc.publicId} onClick={() => void remove(doc.publicId)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg>Delete</button></span></li>)}
            {!mine.length && <li className={styles.notUploaded}>Not uploaded</li>}
          </ul>
          {(!mine.length || !SINGLE_DOCUMENT_TYPES.includes(type)) && <label className={`${styles.uploadButton} ${styles.primary}`}>{busy === type && <Loader />}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M5 14v5h14v-5"/></svg>Upload file<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(e) => { void upload(type, e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} /></label>}
        </Card>;
      })}
    </div>

    <p className={styles.privacy}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v5c0 5 3.2 8 7.5 10 4.3-2 7.5-5 7.5-10V6L12 3Z"/><path d="m9 12 2 2 4-4"/></svg><span>Files are stored privately. Only you and the hiring team can view them. Documents may be PDF, JPG, PNG or WEBP up to 5 MB.</span></p>
    <div className={styles.returnArea}><Button className={styles.returnButton} type="button" disabled={!!busy} onClick={() => router.push("/candidate/profile")}>{busy ? <Loader /> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h12l3 3v13H4V4h1Z"/><path d="M8 4v6h8V4m-8 16v-6h8v6"/></svg>}Save &amp; Return to Profile <span aria-hidden="true">→</span></Button></div>
  </div>;
}
