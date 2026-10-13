"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Input, Loader } from "./ui";

export function AuthForm({ mode, next }: { mode: "login" | "register" | "admin"; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendWait, setResendWait] = useState(0);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!resendWait) return;
    const timer = window.setTimeout(() => setResendWait((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendWait]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const verifyingRegistration = mode === "register" && !!verificationEmail;
    const res = verifyingRegistration
      ? await api("/api/auth/register/verify", "POST", { email: verificationEmail, otp: body.otp })
      : await api(mode === "register" ? "/api/auth/register" : "/api/auth/login", "POST", mode === "admin" ? { ...body, adminOnly: true } : body);
    if (!res.success) {
      setBusy(false); setError(res.message); setErrors(res.errors ?? {});
      return;
    }
    if (mode === "register" && !verifyingRegistration) {
      setBusy(false);
      setVerificationEmail(res.data.email);
      setResendWait(60);
      setNotice(`We sent a 6-digit verification code to ${res.data.email}.`);
      return;
    }
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.replace(res.data.role === "ADMIN" ? "/admin/dashboard" : safeNext ?? "/candidate/dashboard");
    router.refresh();
  }

  async function resendCode() {
    setResending(true); setError(""); setNotice("");
    const res = await api("/api/auth/register/resend", "POST", { email: verificationEmail });
    setResending(false);
    if (!res.success) { setError(res.message); return; }
    setResendWait(60);
    setNotice(`A new verification code was sent to ${verificationEmail}.`);
  }

  return (
    <form key={mode === "register" && verificationEmail ? "registration-otp" : "auth-credentials"} onSubmit={onSubmit} className={`${mode === "admin" ? "admin-auth-form auth-form card" : "auth-form"} space-y-4`} noValidate>
      {mode === "register" && verificationEmail ? (
        <>
          <div className="space-y-1">
            <h2 className="text-xl">Verify your email</h2>
            <p className="text-sm text-stone-600">Enter the 6-digit code we sent to <span className="font-medium text-forest-900">{verificationEmail}</span>. The code expires in 10 minutes.</p>
          </div>
          <Field label="Email verification code" error={errors.otp}>
            <Input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required />
          </Field>
          <button type="button" className="min-h-10 text-sm font-medium text-forest-700 underline disabled:text-stone-500" onClick={resendCode} disabled={resending || resendWait > 0}>
            {resending ? "Sending…" : resendWait > 0 ? `Resend code in ${resendWait}s` : "Resend code"}
          </button>
        </>
      ) : (
        <>
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
        </>
      )}
      {notice && <p role="status" className="rounded-md bg-forest-50 px-3 py-2 text-sm text-forest-700">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <Button type="submit" disabled={busy || (mode === "register" && !!verificationEmail && otp.length !== 6)} className="w-full">{busy && <Loader />}{mode === "register" ? verificationEmail ? "Verify & create account" : "Continue to email verification" : "Log in"}</Button>
      {mode !== "admin" && !(mode === "register" && verificationEmail) && (
        <p className="text-center text-sm text-stone-600">
          {mode === "login" ? <>New here? <Link className="font-medium text-forest-700 underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
            : <>Already registered? <Link className="font-medium text-forest-700 underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></>}
        </p>
      )}
    </form>
  );
}
