import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <h1 className="mb-6 text-3xl">Log in</h1>
      <AuthForm mode="login" next={next} />
    </main>
  );
}
