import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { ContactCopyButton } from "@/components/ContactCopyButton";
import { Shell, type NavItem } from "@/components/Shell";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Contact us" };

function ContactIcon({ kind }: { kind: "email" | "phone" | "address" | "help" }) {
  if (kind === "email") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
  if (kind === "phone") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.7a15 15 0 0 0 4.8 4.8L15 13l5 2v4a2 2 0 0 1-2 2C9.7 20.4 3.6 14.3 3 6a2 2 0 0 1 2-2Z"/></svg>;
  if (kind === "address") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="12" width="4" height="7" rx="2"/><rect x="17" y="12" width="4" height="7" rx="2"/><path d="M17 19a5 5 0 0 1-5 3h-1"/></svg>;
}

export default async function Contact() {
  const session = await getSession();
  const items: NavItem[] = session?.role === "ADMIN" ? [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/applications", label: "Applications" },
    { href: "/admin/candidates", label: "Candidates" },
    { href: "/admin/positions", label: "Positions" },
    { href: "/admin/interviews", label: "Interviews" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/settings", label: "Account settings" },
  ] : [
    { href: "/candidate/dashboard", label: "Home" },
    { href: "/jobs", label: "Positions" },
    { href: "/candidate/applications", label: "Applications" },
    { href: "/candidate/profile", label: "Profile" },
    { href: "/candidate/documents", label: "Documents" },
    { href: "/candidate/interviews", label: "Interviews" },
    { href: "/contact", label: "Help & support" },
    { href: "/candidate/notifications", label: "Notifications" },
    { href: "/candidate/staff", label: "My joining letter" },
  ];
  const phoneHref = `tel:${SITE.phone.replace(/\s/g, "")}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;
  const content = <div className={styles.page}>
    <header className={styles.heading}><h1>Contact Us</h1><p>Questions about a position or your application? Reach our hiring team directly.</p><span aria-hidden="true"><i />✦</span></header>
    <div className={styles.methods}>
      <section className={styles.methodCard}><span className={styles.icon}><ContactIcon kind="email" /></span><div className={styles.methodCopy}><h2>Email</h2><p>Drop us an email anytime</p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div><ContactCopyButton value={SITE.email} label="Copy email" className={styles.action} /></section>
      <section className={styles.methodCard}><span className={styles.icon}><ContactIcon kind="phone" /></span><div className={styles.methodCopy}><h2>Phone</h2><p>Speak with our hiring team</p><a href={phoneHref}>{SITE.phone}</a></div><ContactCopyButton value={SITE.phone} label="Copy phone" className={styles.action} /></section>
      <section className={styles.methodCard}><span className={styles.icon}><ContactIcon kind="address" /></span><div className={styles.methodCopy}><h2>Address</h2><p>Visit our office</p><span>{SITE.address}</span></div><a className={styles.action} href={mapHref} target="_blank" rel="noreferrer"><ContactIcon kind="address" />View on Map</a></section>
    </div>
    <aside className={styles.more}><span className={styles.moreIcon}><ContactIcon kind="help" /></span><div><h2>Need more help?</h2><p>Our hiring team is here to assist you with any questions about job openings, applications or interview process.</p></div><span className={styles.moreOrnament} aria-hidden="true">✧</span></aside>
  </div>;
  if (!session) return content;
  return <Shell area={session.role === "ADMIN" ? "Admin" : "Candidate"} who={session.name.split(" ")[0]} items={items}>{content}</Shell>;
}
