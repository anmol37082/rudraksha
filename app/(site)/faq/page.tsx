import type { Metadata } from "next";
import { FAQS } from "@/lib/site";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Frequently asked questions" };

export default function Faq() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Frequently asked questions</h1>
      <div className={styles.list}>
        {FAQS.map(([q, a]) => (
          <details key={q} className={styles.item}><summary className={styles.question}>{q}</summary><p className={styles.answer}>{a}</p></details>
        ))}
      </div>
    </main>
  );
}
