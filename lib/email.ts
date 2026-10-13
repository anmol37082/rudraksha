import nodemailer from "nodemailer";
import { SITE } from "./site";

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
  await transporter.sendMail({
    from,
    to: email,
    subject: `Verify your ${SITE.name} account`,
    text: `Hello ${name},\n\nYour ${SITE.name} verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<div style="margin:0;background:#f7f2e8;padding:32px 16px;color:#09251b;font-family:Arial,sans-serif"><div style="max-width:480px;margin:auto;border:1px solid #d5c4a4;border-radius:16px;padding:28px;background:#f7f2e8"><p style="margin:0 0 8px;color:#90713b;font-size:12px;letter-spacing:2px;text-transform:uppercase">${SITE.name}</p><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:28px;font-weight:600">Verify your email</h1><p>Hello ${safeName},</p><p>Enter this code to finish creating your candidate account:</p><div style="margin:24px 0;padding:16px;border:1px solid #d5c4a4;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#09251b">${otp}</div><p style="font-size:14px;color:#526258">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div></div>`,
  });
}
