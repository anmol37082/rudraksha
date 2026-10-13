"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { APPLICATION_AGREEMENT_TERMS, APPLICATION_AGREEMENT_VERSION } from "@/lib/agreements";
import { Button, Card, Loader, Textarea, Field } from "./ui";

export function ApplyForm({ positionId, title, summary }: { positionId: string; title: string; summary: [string, string][] }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "agreement">("details");
  const [cover, setCover] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true); setError("");
    const res = await api("/api/applications", "POST", { positionId, answers: { coverNote: cover }, confirm, agreementAccepted });
    if (!res.success) { setBusy(false); setError(res.message); return; }
    router.replace(`/candidate/applications/${res.data.id}`);
    router.refresh();
  }

  if (step === "details") {
    return (
      <Card className="space-y-4">
        <p className="text-sm text-stone-700">We will send the details from your profile and the documents you have uploaded.</p>
        <Field label="Anything you would like us to know? (optional)"><Textarea value={cover} onChange={(e) => setCover(e.target.value)} maxLength={1500} placeholder="Why you want this role, or when you can start" /></Field>
        <Button onClick={() => setStep("agreement")}>Continue to agreement</Button>
      </Card>
    );
  }
  return (
    <Card className="space-y-4">
      <h2 className="text-xl">Step 2 of 2: Review and agreement</h2>
      <p className="text-sm text-stone-600">Review your details and read the application terms before submitting.</p>
      <p className="font-medium">{title}</p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {summary.map(([k, v]) => <div key={k}><dt className="text-stone-500">{k}</dt><dd className="font-medium">{v || "-"}</dd></div>)}
        <div className="sm:col-span-2"><dt className="text-stone-500">Your note</dt><dd className="whitespace-pre-line">{cover || "-"}</dd></div>
      </dl>
      <section className="space-y-3 rounded-md border border-forest-100 bg-forest-50 p-4" aria-labelledby="application-terms-heading">
        <div className="flex items-center justify-between gap-3">
          <h3 id="application-terms-heading" className="text-lg">Application agreement</h3>
          <span className="text-xs text-stone-500">Version {APPLICATION_AGREEMENT_VERSION}</span>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
          {APPLICATION_AGREEMENT_TERMS.map((term) => <li key={term}>{term}</li>)}
        </ol>
      </section>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={agreementAccepted} onChange={(e) => setAgreementAccepted(e.target.checked)} />
        I have read and agree to the application terms above.
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        I confirm that the information provided by me is correct.
      </label>
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep("details")} disabled={busy}>Back</Button>
        <Button onClick={submit} disabled={!confirm || !agreementAccepted || busy}>{busy && <Loader />}Submit application</Button>
      </div>
    </Card>
  );
}
