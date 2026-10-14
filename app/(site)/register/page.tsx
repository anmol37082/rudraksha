import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthPageLayout } from "@/components/AuthPageLayout";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthPageLayout variant="register" title="Create Account" subtitle="">
      <AuthForm mode="register" next={next} />
    </AuthPageLayout>
  );
}
