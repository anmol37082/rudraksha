import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { Application } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { EMPLOYMENT_LABEL, STATUS_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui";
import styles from "./page.module.css";

const filters = [
  { key: "all", label: "All" },
  { key: "review", label: "In Review" },
  { key: "interview", label: "Interview" },
  { key: "selected", label: "Selected" },
] as const;

function belongs(status: string, filter: (typeof filters)[number]["key"]) {
  if (filter === "all") return true;
  if (filter === "review") return ["NEW", "UNDER_REVIEW", "SHORTLISTED"].includes(status);
  if (filter === "interview") return ["INTERVIEW_SCHEDULED", "INTERVIEWED"].includes(status);
  return status === "SELECTED";
}

function FactIcon({ kind }: { kind: "location" | "date" | "status" }) {
  if (kind === "location") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>;
  if (kind === "date") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></svg>;
}

export default async function Applications({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePage("CANDIDATE");
  const { status: requestedFilter = "all" } = await searchParams;
  const activeFilter = filters.some((filter) => filter.key === requestedFilter) ? requestedFilter as (typeof filters)[number]["key"] : "all";
  const apps = plain(await Application.find({ candidateId: user._id }).sort({ createdAt: -1 }).select("status appliedAt positionId").populate("positionId", "title location employmentType").lean()) as any[];
  const visibleApps = apps.filter((app) => belongs(app.status, activeFilter));

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <h1>My Applications</h1>
        <p>Track the status of your job applications.</p>
        <span aria-hidden="true"><i />✦</span>
      </header>

      <nav className={styles.filters} aria-label="Filter applications">
        {filters.map((filter) => {
          const count = apps.filter((app) => belongs(app.status, filter.key)).length;
          return <Link key={filter.key} href={filter.key === "all" ? "/candidate/applications" : `/candidate/applications?status=${filter.key}`} aria-current={activeFilter === filter.key ? "page" : undefined} className={`${styles.filterLink} ${activeFilter === filter.key ? styles.active : ""}`}>
            {filter.key === "all" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h3"/></svg>}
            {filter.key === "review" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>}
            {filter.key === "interview" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 9h16m-8 3v5m-2.5-2.5h5"/></svg>}
            {filter.key === "selected" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>}
            <span>{filter.label}</span><small>{count}</small>
          </Link>;
        })}
      </nav>

      {visibleApps.length ? <>
        <div className={styles.list}>
        {visibleApps.map((app) => <article className={styles.card} key={app._id}>
          <div className={styles.cardHeading}>
            <span className={styles.roleIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3.5 12h17M10 12v2h4v-2"/></svg></span>
            <div className={styles.roleTitle}><h2>{app.positionId?.title ?? "Position no longer available"}</h2>{app.positionId?.employmentType && <span>{EMPLOYMENT_LABEL[app.positionId.employmentType] ?? app.positionId.employmentType}</span>}</div>
            <Badge status={app.status} label={STATUS_LABEL[app.status] ?? app.status} />
          </div>
          <dl className={styles.facts}>
            <div><dt><FactIcon kind="location" />Location</dt><dd>{app.positionId?.location ?? "—"}</dd></div>
            <div><dt><FactIcon kind="date" />Applied on</dt><dd>{fmtDate(app.appliedAt)}</dd></div>
            <div><dt><FactIcon kind="status" />Status</dt><dd>{STATUS_LABEL[app.status] ?? app.status}</dd></div>
          </dl>
          <Link className={styles.viewLink} href={`/candidate/applications/${app._id}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>View Application <span aria-hidden="true">→</span></Link>
        </article>)}
        </div>
        {activeFilter === "all" && <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="13" y="8" width="38" height="48" rx="5"/><path d="M23 21h18M23 31h18M23 41h12"/><circle cx="47" cy="46" r="10" fill="#f3e4c8"/><path d="m43 46 3 3 5-6"/></svg><i>✦</i></div>
          <h2>No more applications</h2><p>You haven’t applied to any other positions yet.</p><Link href="/jobs"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7"/></svg>Explore Open Positions <span aria-hidden="true">→</span></Link>
        </div>}
      </> : apps.length ? <div className={styles.emptyFilter}><p>No applications in this category yet.</p><Link href="/candidate/applications">Show all applications</Link></div> : <div className={styles.empty}>
        <div className={styles.emptyArt} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="13" y="8" width="38" height="48" rx="5"/><path d="M23 21h18M23 31h18M23 41h12"/><circle cx="47" cy="46" r="10" fill="#f3e4c8"/><path d="m43 46 3 3 5-6"/></svg><i>✦</i></div>
        <h2>No more applications</h2><p>You haven’t applied to any other positions yet.</p><Link href="/jobs"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7"/></svg>Explore Open Positions <span aria-hidden="true">→</span></Link>
      </div>}
    </section>
  );
}
