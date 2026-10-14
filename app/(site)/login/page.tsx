import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthPageLayout } from "@/components/AuthPageLayout";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthPageLayout variant="login" title="Welcome Back" subtitle="">
      <AuthForm mode="login" next={next} />
    </AuthPageLayout>
  );
}
