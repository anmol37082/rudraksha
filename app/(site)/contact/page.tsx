import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contact us" };

export default function Contact() {
  return (
    <main className="contact-page mx-auto max-w-3xl px-4 py-6 sm:py-12">
      <h1 className="text-3xl sm:text-4xl">Contact us</h1>
      <p className="mt-4 text-stone-700">Questions about a position or your application? Reach our hiring team directly.</p>
      <dl className="mt-6 grid gap-3 sm:mt-8 sm:gap-6 sm:grid-cols-3">
        <div className="card contact-method"><dt className="text-sm text-stone-500">Email</dt><dd className="mt-1 font-medium"><a className="underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></dd></div>
        <div className="card contact-method"><dt className="text-sm text-stone-500">Phone</dt><dd className="mt-1 font-medium"><a className="underline" href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></dd></div>
        <div className="card contact-method"><dt className="text-sm text-stone-500">Address</dt><dd className="mt-1 font-medium">{SITE.address}</dd></div>
      </dl>
    </main>
  );
}
