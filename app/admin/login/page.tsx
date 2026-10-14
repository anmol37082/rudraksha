import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthPageLayout } from "@/components/AuthPageLayout";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return <AuthPageLayout title="Admin Login" subtitle="Sign in to your hiring team account" variant="login">
      <AuthForm mode="admin" />
    </AuthPageLayout>;
}
