"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Input, Loader } from "./ui";

export function AuthForm({ mode, next }: { mode: "login" | "register" | "admin"; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await api(mode === "register" ? "/api/auth/register" : "/api/auth/login", "POST", mode === "admin" ? { ...body, adminOnly: true } : body);
    if (!res.success) {
      setBusy(false); setError(res.message); setErrors(res.errors ?? {});
      return;
    }
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.replace(res.data.role === "ADMIN" ? "/admin/dashboard" : safeNext ?? "/candidate/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4" noValidate>
      {mode === "register" && (
        <>
          <Field label="Full name" error={errors.name}><Input name="name" autoComplete="name" required /></Field>
          <Field label="Phone" error={errors.phone}><Input name="phone" type="tel" autoComplete="tel" required /></Field>
        </>
      )}
      <Field label="Email" error={errors.email}><Input name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" error={errors.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number" : undefined}>
        <Input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required />
      </Field>
      {mode === "register" && <Field label="Confirm password" error={errors.confirmPassword}><Input name="confirmPassword" type="password" autoComplete="new-password" required /></Field>}
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy && <Loader />}{mode === "register" ? "Create account" : "Log in"}</Button>
      {mode !== "admin" && (
        <p className="text-center text-sm text-stone-600">
          {mode === "login" ? <>New here? <Link className="font-medium text-forest-700 underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
            : <>Already registered? <Link className="font-medium text-forest-700 underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></>}
        </p>
      )}
    </form>
  );
}
