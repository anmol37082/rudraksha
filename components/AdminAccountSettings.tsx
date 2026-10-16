"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Card, Field, Input, Loader } from "@/components/ui";
import styles from "./AdminAccountSettings.module.css";

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
    <div className={styles.settings}>
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Admin email</h2>
        <p className={styles.description}>Current email: <span className={styles.currentEmail}>{currentEmail}</span></p>
        <form onSubmit={(e) => submit(e, "email")} className={styles.form} noValidate>
          <Field label="New email address"><Input name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
          {error && busy === "email" && <p role="alert" className={styles.inlineError}>{error}</p>}
          <Button type="submit" disabled={!!busy}>{busy === "email" && <Loader />}Update email</Button>
        </form>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Change password</h2>
        <p className={styles.description}>Use at least 8 characters, including a letter and a number.</p>
        <form onSubmit={(e) => submit(e, "password")} className={styles.form} noValidate>
          <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" required /></Field>
          <Field label="New password"><Input name="newPassword" type="password" autoComplete="new-password" required /></Field>
          <Field label="Confirm new password"><Input name="confirmPassword" type="password" autoComplete="new-password" required /></Field>
          {error && busy === "password" && <p role="alert" className={styles.inlineError}>{error}</p>}
          <Button type="submit" disabled={!!busy}>{busy === "password" && <Loader />}Change password</Button>
        </form>
      </Card>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {error && !busy && <p role="alert" className={styles.errorNotice}>{error}</p>}
    </div>
  );
}
