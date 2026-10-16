import Link from "next/link";
import { adminStats } from "@/lib/data";
import { fmtDate } from "@/lib/client";
import { STATUS_LABEL } from "@/lib/constants";
import { Badge, EmptyState } from "@/components/ui";
import styles from "./page.module.css";

type StatIconName = "people" | "file" | "hourglass" | "shortlist" | "calendar" | "selected" | "rejected" | "briefcase" | "building";

function StatIcon({ name }: { name: StatIconName }) {
  const paths: Record<StatIconName, React.ReactNode> = {
    people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0 0-6m1 9a5 5 0 0 1 3.5 5"/></>,
    file: <><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6m-6 4h6"/></>,
    hourglass: <><path d="M6 3h12M6 21h12M7 3c0 5 5 5 5 9s-5 4-5 9m10-18c0 5-5 5-5 9s5 4 5 9"/></>,
    shortlist: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0m4-12 1.3 2.6L22 11l-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3L13.2 11l3.2-.4L18 8Z"/></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 9h16m-8 3v5m-2.5-2.5h5"/></>,
    selected: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    rejected: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
    briefcase: <><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3.5 12h17M10 12v2h4v-2"/></>,
    building: <><path d="M4 21V5l8-3v19m0-13h8v13M2 21h20"/><path d="M7 7h2m-2 4h2m-2 4h2m7-3h2m-2 4h2"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default async function AdminDashboard() {
  const { stats: s, recent, upcoming } = (await adminStats()) as any;
  const cards: { label: string; value: number; icon: StatIconName; href: string }[] = [
    { label: "Candidates", value: s.candidates, icon: "people", href: "/admin/candidates" },
    { label: "New applications", value: s.newApps, icon: "file", href: "/admin/applications?status=NEW" },
    { label: "Under review", value: s.review, icon: "hourglass", href: "/admin/applications?status=UNDER_REVIEW" },
    { label: "Shortlisted", value: s.shortlisted, icon: "shortlist", href: "/admin/applications?status=SHORTLISTED" },
    { label: "Interviews", value: s.interviews, icon: "calendar", href: "/admin/interviews" },
    { label: "Selected", value: s.selected, icon: "selected", href: "/admin/applications?status=SELECTED" },
    { label: "Rejected", value: s.rejected, icon: "rejected", href: "/admin/applications?status=REJECTED" },
    { label: "Active positions", value: s.positions, icon: "briefcase", href: "/admin/positions" },
    { label: "Permanent staff", value: s.staff, icon: "building", href: "/admin/staff" },
  ];

  return <div>
    <header className={styles.heading}><h1>Dashboard</h1><p>Welcome back! Here’s an overview of your hiring activity.</p><span aria-hidden="true"><i />✦</span></header>

    <section className={styles.stats} aria-label="Hiring statistics">
      {cards.map((card) => <Link className={styles.stat} href={card.href} key={card.label}>
        <span className={styles.statIcon}><StatIcon name={card.icon} /></span><span className={styles.statCopy}><strong>{card.value}</strong><small>{card.label}</small></span><span className={styles.statArrow} aria-hidden="true">›</span>
      </Link>)}
    </section>

    <div className={styles.sections}>
      <section className={styles.section}>
        <header><h2>Recent applications</h2><Link href="/admin/applications">View all <span aria-hidden="true">→</span></Link></header>
        {recent.length ? <div className={styles.list}>
          {recent.map((application: any) => <article className={styles.listCard} key={application._id}>
            <div className={styles.rowTop}><span className={styles.initial}>{application.candidateId?.name?.[0] ?? "C"}</span><strong>{application.candidateId?.name ?? "Candidate"}</strong><Badge status={application.status} label={STATUS_LABEL[application.status] ?? application.status} /></div>
            <p className={styles.rowMeta}><span>{application.positionId?.title ?? "Position"}</span><i>·</i><span>Applied {fmtDate(application.appliedAt)}</span></p>
            <Link className={styles.rowAction} href={`/admin/applications/${application._id}`}>Open application <span aria-hidden="true">→</span></Link>
          </article>)}
        </div> : <EmptyState title="No applications yet" />}
      </section>

      <section className={styles.section}>
        <header><h2>Upcoming interviews</h2><Link href="/admin/interviews">View all <span aria-hidden="true">→</span></Link></header>
        {upcoming.length ? <div className={styles.list}>
          {upcoming.map((interview: any) => <article className={styles.listCard} key={interview._id}>
            <div className={styles.rowTop}><span className={styles.initial}>{interview.candidateId?.name?.[0] ?? "C"}</span><strong>{interview.candidateId?.name ?? "Candidate"}</strong><Badge status={interview.status} label={STATUS_LABEL[interview.status] ?? interview.status} /></div>
            <p className={styles.rowMeta}><span>{interview.positionId?.title ?? "Position"}</span><i>·</i><span>{fmtDate(interview.date)} {interview.time}</span></p>
            <p className={styles.rowMode}>{interview.type === "IN_PERSON" ? `In person${interview.location ? ` (${interview.location})` : ""}` : interview.type === "VIDEO" ? "Video call" : "Phone call"}</p>
            <Link className={styles.rowAction} href={`/admin/applications/${interview.applicationId}`}>Open application <span aria-hidden="true">→</span></Link>
          </article>)}
        </div> : <EmptyState title="No upcoming interviews" />}
      </section>
    </div>
  </div>;
}
