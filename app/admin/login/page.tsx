import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="mb-1 text-3xl">Admin login</h1>
      <p className="mb-6 text-stone-600">{SITE.name} hiring team</p>
      <AuthForm mode="admin" />
    </main>
  );
}
