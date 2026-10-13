"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, Field, Input, Loader } from "@/components/ui";

export function AdminAccountSettings({ email }: { email: string }) {
  const [busy, setBusy] = useState<"email" | "password" | "">("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [currentEmail, setCurrentEmail] = useState(email);

  async function submit(e: React.FormEvent<HTMLFormElement>, kind: "email" | "password") {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(kind); setNotice(""); setError("");
    const values = Object.fromEntries(new FormData(form));
    const body = kind === "email"
      ? { currentPassword: values.currentPassword, email: values.email }
      : { currentPassword: values.currentPassword, newPassword: values.newPassword, confirmPassword: values.confirmPassword };
    const result = await api<{ email: string }>("/api/admin/account", "PATCH", body);
    setBusy("");
    if (!result.success) { setError(result.message); return; }
    if (kind === "email" && result.data?.email) setCurrentEmail(result.data.email);
    form.reset();
    setNotice(result.message);
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <h2 className="text-xl">Admin email</h2>
        <p className="mt-1 text-sm text-stone-600">Current email: <span className="font-medium text-forest-900">{currentEmail}</span></p>
        <form onSubmit={(e) => submit(e, "email")} className="mt-5 space-y-4" noValidate>
          <Field label="New email address"><Input name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
          {error && busy === "email" && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" disabled={!!busy}>{busy === "email" && <Loader />}Update email</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl">Change password</h2>
        <p className="mt-1 text-sm text-stone-600">Use at least 8 characters, including a letter and a number.</p>
        <form onSubmit={(e) => submit(e, "password")} className="mt-5 space-y-4" noValidate>
          <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
          <Field label="New password"><Input name="newPassword" type="password" autoComplete="new-password" required /></Field>
          <Field label="Confirm new password"><Input name="confirmPassword" type="password" autoComplete="new-password" required /></Field>
          {error && busy === "password" && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" disabled={!!busy}>{busy === "password" && <Loader />}Change password</Button>
        </form>
      </Card>
      {notice && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      {error && !busy && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
    </div>
  );
}
