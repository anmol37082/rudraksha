import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard");

  return (
    <main className={styles.landing}>
      <section className={styles.hero} aria-label="Join the wedding staff team">
        <div className={styles.heroActions}>
          <Link href="/login" className={styles.primaryAction}>Join Staff <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></span></Link>
        </div>
      </section>
    </main>
  );
}
