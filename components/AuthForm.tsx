"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Input, Loader } from "./ui";
import styles from "./AuthForm.module.css";

function AuthInput({ icon, ...props }: React.ComponentProps<typeof Input> & { icon: "person" | "phone" | "email" | "lock" | "code" }) {
  return (
    <span className={`auth-input-shell ${styles.inputShell}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {icon === "person" && <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>}
        {icon === "phone" && <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5ZM10 17.5h4" />}
        {icon === "email" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>}
        {icon === "lock" && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>}
        {icon === "code" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h.01M12 10h.01M17 10h.01M7 14h.01M12 14h.01M17 14h.01" /></>}
      </svg>
      <Input {...props} />
    </span>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "register" | "admin"; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
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
    const destination = res.data.role === "ADMIN"
      ? "/admin/dashboard"
      : verifyingRegistration || !res.data.profileComplete
        ? "/candidate/profile"
        : safeNext ?? "/candidate/dashboard";
    router.replace(destination);
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
    <form key={mode === "register" && verificationEmail ? "registration-otp" : "auth-credentials"} onSubmit={onSubmit} className={`${mode === "admin" ? "admin-auth-form auth-form card" : "auth-form"} ${mode === "register" && verificationEmail ? "auth-verify-form" : ""} ${styles.form} ${mode === "register" ? styles.register : styles.login} ${mode === "admin" ? styles.adminForm : ""} ${mode === "register" && verificationEmail ? styles.verifyForm : ""} space-y-4`} noValidate>
      {mode === "register" && verificationEmail ? (
        <>
          <div className={styles.verifyIntro}>
            <h2>Verify Your Email</h2>
            <p>Enter the 6-digit verification code we sent to<br /><strong>{verificationEmail}</strong></p>
          </div>
          <div className={styles.otpCells} role="group" aria-label="Email verification code">
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={(element) => { otpRefs.current[index] = element; }}
                aria-label={`Verification digit ${index + 1}`}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={otp[index] ?? ""}
                onChange={(event) => {
                  const entered = event.target.value.replace(/\D/g, "");
                  if (entered.length > 1) {
                    const code = entered.slice(0, 6);
                    setOtp(code);
                    otpRefs.current[Math.min(code.length, 5)]?.focus();
                    return;
                  }
                  const digit = entered.slice(-1);
                  const next = otp.split("");
                  next[index] = digit;
                  setOtp(next.join("").slice(0, 6));
                  if (digit && index < 5) otpRefs.current[index + 1]?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
                  if (event.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
                  if (event.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  setOtp(digits);
                  otpRefs.current[Math.min(digits.length, 5)]?.focus();
                }}
                required
                className={styles.otpInput}
              />
            ))}
            <input type="hidden" name="otp" value={otp} />
          </div>
          {errors.otp && <p role="alert" className="text-center text-sm text-rose-700">{errors.otp}</p>}
          <div className={styles.resendBlock}>
            <span>Didn’t receive the code?</span>
            <button type="button" onClick={resendCode} disabled={resending || resendWait > 0}>{resending ? "Sending…" : "Resend code"}</button>
            {resendWait > 0 && <span>in 00:{String(resendWait).padStart(2, "0")}</span>}
          </div>
        </>
      ) : (
        <>
          {mode === "register" && (
            <>
              <Field label="Full name" error={errors.name}><AuthInput icon="person" name="name" autoComplete="name" required /></Field>
              <Field label="Phone" error={errors.phone}><AuthInput icon="phone" name="phone" type="tel" autoComplete="tel" required /></Field>
            </>
          )}
          <Field label="Email" error={errors.email}><AuthInput icon="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" error={errors.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number" : undefined}>
            <AuthInput icon="lock" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} required />
          </Field>
          {mode === "register" && <Field label="Confirm password" error={errors.confirmPassword}><AuthInput icon="lock" name="confirmPassword" type="password" autoComplete="new-password" required /></Field>}
        </>
      )}
      {notice && !verificationEmail && <p role="status" className="rounded-md bg-forest-50 px-3 py-2 text-sm text-forest-700">{notice}</p>}
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      <Button type="submit" disabled={busy || (mode === "register" && !!verificationEmail && !/^\d{6}$/.test(otp))} className={`w-full auth-submit ${styles.submit}`}>{busy && <Loader />}<span>{mode === "register" ? verificationEmail ? "Verify & Continue" : "Continue to email verification" : "Log in"}</span><span className={`auth-submit-arrow ${styles.submitArrow}`} aria-hidden="true">→</span></Button>
      {mode === "register" && verificationEmail && <p className={styles.securityNote}><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5 16 5v4.2c0 4-2.6 6.7-6 8.3-3.4-1.6-6-4.3-6-8.3V5l6-2.5Z"/><path d="m7.5 9.7 1.6 1.6 3.5-3.6"/></svg>Your account security matters to us.</p>}
      {mode !== "admin" && !(mode === "register" && verificationEmail) && (
        <p className="text-center text-sm text-stone-600">
          {mode === "login" ? <>New here? <Link className="font-medium text-forest-700 underline" href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
            : <>Already registered? <Link className="font-medium text-forest-700 underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></>}
        </p>
      )}
    </form>
  );
}
