import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard");

  return (
    <main className={styles.landing}>
      <section className={styles.hero} aria-labelledby="staff-title">
        <header className={styles.heroHeader}>
          <Image className={styles.logo} src="/RUDRAKSHA-CROPPED.png" alt="Rudraksha Events" width={220} height={182} priority />
        </header>
        <div className={styles.heroCopy}>
          <h1 id="staff-title">Hire Trusted<br />Wedding Staff</h1>
          <p>Find skilled, professional staff for your wedding and special events.</p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryAction}>Join Staff <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
