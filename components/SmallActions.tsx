"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { STAFF_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { Button, Select } from "./ui";

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return { busy, err, async run(fn: () => ReturnType<typeof api>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setErr("");
    const r = await fn();
    setBusy(false);
    if (!r.success) setErr(r.message); else router.refresh();
  } };
}

export function CandidateToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const { busy, err, run } = useRun();
  return (
    <div>
      <Button small variant={isActive ? "danger" : "primary"} disabled={busy} onClick={() => run(() => api(`/api/admin/candidates/${id}`, "PUT", { isActive: !isActive }), isActive ? "Deactivate this candidate? They will not be able to log in." : undefined)}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      {err && <p role="alert" className="mt-1 text-xs text-rose-700">{err}</p>}
    </div>
  );
}

export function PositionRowActions({ id, status }: { id: string; status: string }) {
  const { busy, err, run } = useRun();
  const set = (s: string) => run(() => api(`/api/positions/${id}`, "PUT", { status: s }), s === "CLOSED" ? "Close this position? Candidates will no longer be able to apply." : undefined);
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {status !== "ACTIVE" && <Button small variant="outline" disabled={busy} onClick={() => set("ACTIVE")}>Activate</Button>}
      {status === "ACTIVE" && <Button small variant="outline" disabled={busy} onClick={() => set("PAUSED")}>Pause</Button>}
      {status !== "CLOSED" && <Button small variant="outline" disabled={busy} onClick={() => set("CLOSED")}>Close</Button>}
      <Button small variant="danger" disabled={busy} onClick={() => run(() => api(`/api/positions/${id}`, "DELETE"), "Delete this position permanently?")}>Delete</Button>
      {err && <p role="alert" className="w-full text-right text-xs text-rose-700">{err}</p>}
    </div>
  );
}

export function StaffStatus({ id, status }: { id: string; status: string }) {
  const { busy, err, run } = useRun();
  return (
    <div>
      <Select aria-label="Staff status" value={status} disabled={busy} className="!w-36 !py-1.5" onChange={(e) => run(() => api(`/api/admin/staff/${id}`, "PUT", { status: e.target.value }))}>
        {STAFF_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </Select>
      {err && <p role="alert" className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}
