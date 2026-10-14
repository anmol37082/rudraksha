import Image from "next/image";
import Link from "next/link";
import { AuthBackButton } from "./AuthBackButton";

export function AuthPageLayout({ title, subtitle, children, variant }: { title: string; subtitle: string; children: React.ReactNode; variant?: "login" | "register" }) {
  return (
    <main className={`auth-page ${variant ? `auth-${variant}` : ""} mx-auto flex min-h-[100svh] max-w-md flex-col px-5 pb-8 pt-5 sm:justify-center sm:px-4 sm:py-8`}>
      <header className="auth-page-header">
        <AuthBackButton />
        <Link href="/jobs" className="auth-brand" aria-label="Rudraksha Events — open positions">
          <Image src="/RUDRAKSHA-CROPPED.png" alt="Rudraksha Events" width={220} height={182} priority />
        </Link>
      </header>
      <div className="auth-intro">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
