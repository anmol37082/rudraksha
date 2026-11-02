"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client";
import { ActionDialog } from "@/components/ActionDialog";

export function EventDocumentManager({ eventId, initialDocuments }: { eventId: string; initialDocuments: any[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [documentToRemove, setDocumentToRemove] = useState<string | null>(null);
  async function upload(form: HTMLFormElement) {
    setBusy(true); setError("");
    const result = await api(`/api/events/${eventId}/documents`, "POST", new FormData(form));
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setDocuments([result.data, ...documents]); form.reset(); router.refresh();
  }
  async function remove(documentId: string) {
    setDocumentToRemove(documentId);
  }
  async function confirmRemove() {
    if (!documentToRemove) return;
    setBusy(true); setError("");
    const documentId = documentToRemove;
    const result = await api(`/api/events/${eventId}/documents/${documentId}`, "DELETE");
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setDocuments(documents.filter((item) => item._id !== documentId)); setDocumentToRemove(null); router.refresh();
  }
  return <section className="card mt-5 space-y-4">
    {documentToRemove && <ActionDialog title="Remove event document?" description="This removes the private document from the event record." fields={[]} submitLabel="Remove document" busy={busy} onCancel={() => setDocumentToRemove(null)} onSubmit={() => void confirmRemove()} />}
    <div><h2 className="font-serif text-xl">Event documents</h2><p className="mt-1 text-sm text-stone-600">Private files are available only to administrators. Allowed formats: PDF, JPG, PNG, WEBP (maximum 10 MB).</p></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <form method="post" className="grid gap-3 sm:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void upload(event.currentTarget); }}>
      <Field label="Document type"><Input name="documentType" required minLength={2} maxLength={80} placeholder="e.g. Venue plan" /></Field>
      <Field label="Private document"><Input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" /></Field>
      <div className="flex items-end"><Button disabled={busy}>{busy ? "Uploading…" : "Upload document"}</Button></div>
    </form>
    {documents.length ? <ul className="divide-y">{documents.map((document) => {
      const file = document.file ?? {};
      return <li key={document._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0"><p className="font-medium">{document.documentType} · v{document.version}</p><p className="break-all text-xs text-stone-500">{file.originalName ?? "Private file"} · {file.format?.toUpperCase() ?? "FILE"} · {file.bytes ?? "—"} bytes · {document.createdAt ? new Date(document.createdAt).toLocaleString("en-IN") : "just now"}</p></div>
        <div className="flex gap-2"><a className="btn-outline btn-sm" href={`/api/files?publicId=${encodeURIComponent(file.publicId ?? "")}`}>Download</a><Button small type="button" variant="outline" onClick={() => void remove(document._id)}>Remove</Button></div>
      </li>;
    })}</ul> : <p className="text-sm text-stone-500">No event documents have been uploaded.</p>}
  </section>;
}
