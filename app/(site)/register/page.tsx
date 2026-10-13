import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <h1 className="mb-2 text-3xl">Create your account</h1>
      <p className="mb-6 text-stone-600">It takes a minute. You can complete your profile after you sign up.</p>
      <AuthForm mode="register" next={next} />
    </main>
  );
}
