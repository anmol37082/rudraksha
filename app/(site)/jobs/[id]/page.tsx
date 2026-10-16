import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPosition, isOpen } from "@/lib/data";
import { DOCUMENT_LABEL, EMPLOYMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, LinkButton } from "@/components/ui";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await findPosition((await params).id);
  return p && p.status === "ACTIVE" ? { title: p.title, description: p.description.slice(0, 155) } : { title: "Position", robots: { index: false } };
}

const List = ({ title, items }: { title: string; items?: string[] }) =>
  items?.length ? (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </section>
  ) : null;

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const p = await findPosition((await params).id);
  if (!p || p.status === "PAUSED") notFound();
  const open = isOpen(p);
  const facts: [string, string][] = [
    ["Location", p.location], ["Employment", EMPLOYMENT_LABEL[p.employmentType]], ["Experience", p.experienceRequired || "Freshers welcome"],
    ["Compensation", p.compensation || "Discussed at interview"], ["Openings", String(p.openings)], ["Apply by", p.applicationDeadline ? fmtDate(p.applicationDeadline) : "Open until filled"],
  ];
  return (
    <main className={styles.page}>
      <article>
        <h1 className={styles.title}>{p.title}</h1>
        <p className={styles.description}>{p.description}</p>
        <List title="Responsibilities" items={p.responsibilities} />
        <List title="Requirements" items={p.requirements} />
        <List title="Skills" items={p.skills} />
        {p.requiredDocuments?.length > 0 && <List title="Documents you will need" items={p.requiredDocuments.map((d: string) => DOCUMENT_LABEL[d])} />}
      </article>
      <aside className={`card position-facts ${styles.factsPanel}`}>
        <dl className={styles.factsList}>
          {facts.map(([k, v]) => <div key={k}><dt className={styles.factLabel}>{k}</dt><dd className={styles.factValue}>{v}</dd></div>)}
        </dl>
        <div className={styles.actionArea}>
          {open ? <LinkButton className={styles.applyButton} href={`/candidate/apply/${p._id}`}>Apply now</LinkButton> : <div className={styles.closedState}><Badge status="CLOSED" label="Applications closed" /></div>}
        </div>
      </aside>
    </main>
  );
}
