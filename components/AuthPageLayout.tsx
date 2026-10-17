import Image from "next/image";
import Link from "next/link";
import { AuthBackButton } from "./AuthBackButton";
import styles from "./AuthPageLayout.module.css";

export function AuthPageLayout({ title, subtitle, children, variant }: { title: string; subtitle: string; children: React.ReactNode; variant?: "login" | "register" }) {
  return (
    <main className={`auth-page ${variant ? `auth-${variant}` : ""} ${styles.page} ${variant === "login" ? styles.login : ""} ${variant === "register" ? styles.register : ""}`}>
      <header className={`auth-page-header ${styles.header}`}>
        <AuthBackButton />
        <Link href="/jobs" className={`auth-brand ${styles.brand}`} aria-label="Rudraksha Events — open positions">
          <Image src="/rudrakshanobg.png" alt="Rudraksha Events" width={220} height={182} priority />
        </Link>
      </header>
      <div className={`auth-intro ${styles.intro}`}>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}
