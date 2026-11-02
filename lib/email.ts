import nodemailer from "nodemailer";
import { SITE } from "./site";

const RETRY_DELAYS_MS = [150, 400] as const;
const TRANSIENT_SMTP_CODES = new Set(["ECONNECTION", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ESOCKET", "EPIPE"]);

export function isTransientSmtpError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; responseCode?: unknown };
  if (e.code === "EAUTH") return false;
  if (typeof e.responseCode === "number") return e.responseCode >= 400 && e.responseCode < 500;
  return typeof e.code === "string" && TRANSIENT_SMTP_CODES.has(e.code);
}

export async function sendWithTransientRetries<T>(send: () => Promise<T>, wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send();
    } catch (error) {
      if (!isTransientSmtpError(error) || attempt >= RETRY_DELAYS_MS.length) throw error;
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

export async function sendRegistrationOtp(email: string, name: string, otp: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) {
    throw new Error("SMTP settings are incomplete");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
  const safeName = escapeHtml(name);
  await sendWithTransientRetries(() => transporter.sendMail({
    from,
    to: email,
    subject: `Verify your ${SITE.name} account`,
    text: `Hello ${name},\n\nYour ${SITE.name} verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<div style="margin:0;background:#f7f2e8;padding:32px 16px;color:#09251b;font-family:Arial,sans-serif"><div style="max-width:480px;margin:auto;border:1px solid #d5c4a4;border-radius:16px;padding:28px;background:#f7f2e8"><p style="margin:0 0 8px;color:#90713b;font-size:12px;letter-spacing:2px;text-transform:uppercase">${SITE.name}</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:600">Verify your email</h1><p>Hello ${safeName},</p><p>Enter this code to finish creating your candidate account:</p><div style="margin:24px 0;padding:16px;border:1px solid #d5c4a4;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#09251b">${otp}</div><p style="font-size:14px;color:#526258">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div></div>`,
  }));
}
