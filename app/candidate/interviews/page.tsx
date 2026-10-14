import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { Interview } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { STATUS_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui";

const interviewFilters = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
] as const;

function matchesFilter(status: string, filter: (typeof interviewFilters)[number]["key"]) {
  if (filter === "all") return true;
  if (filter === "upcoming") return status === "SCHEDULED" || status === "RESCHEDULED";
  return status === "COMPLETED";
}

function CalendarIcon({ small = false }: { small?: boolean }) {
  return <svg className={small ? "interview-small-icon" : undefined} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 9h16M8 13h2m4 0h2m-8 4h2"/></svg>;
}

export default async function Interviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePage("CANDIDATE");
  const { status: requestedFilter = "all" } = await searchParams;
  const activeFilter = interviewFilters.some((filter) => filter.key === requestedFilter) ? requestedFilter as (typeof interviewFilters)[number]["key"] : "all";
  const items = plain(await Interview.find({ candidateId: user._id }).sort({ date: 1 }).populate("positionId", "title").lean()) as any[];
  const visibleItems = items.filter((item) => matchesFilter(item.status, activeFilter));

  return <section className="interviews-page">
    <header className="interviews-heading"><h1>Interviews</h1><p>Your scheduled and past interviews</p><span aria-hidden="true"><i />✦</span></header>
    <nav className="interview-filters" aria-label="Filter interviews">
      {interviewFilters.map((filter) => {
        const count = items.filter((item) => matchesFilter(item.status, filter.key)).length;
        return <Link key={filter.key} href={filter.key === "all" ? "/candidate/interviews" : `/candidate/interviews?status=${filter.key}`} aria-current={activeFilter === filter.key ? "page" : undefined} className={activeFilter === filter.key ? "is-active" : ""}>
          {filter.key === "all" ? <CalendarIcon small /> : filter.key === "upcoming" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>}
          <span>{filter.label}</span><small>{count}</small>
        </Link>;
      })}
    </nav>

    {visibleItems.length ? <div className="interview-list">
      {visibleItems.map((item) => {
        const format = item.type === "IN_PERSON" ? `In person${item.location ? `: ${item.location}` : ""}` : item.type === "VIDEO" ? "Video call" : "Phone call";
        return <article key={item._id} className="interview-card">
          <div className="interview-card-heading"><span className="interview-card-icon"><CalendarIcon /></span><div className="interview-title"><h2>{item.positionId?.title ?? "Interview"}</h2><p>Interview Schedule</p></div><Badge status={item.status} label={STATUS_LABEL[item.status] ?? item.status} /></div>
          <dl className="interview-facts">
            <div><dt><CalendarIcon small /></dt><dd>{fmtDate(item.date)} at {item.time}</dd></div>
            <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg></dt><dd>{format}</dd></div>
            {item.interviewer && <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 0 0 0-6m1 10a5 5 0 0 1 3.5 5"/></svg></dt><dd>Interviewer: {item.interviewer}</dd></div>}
          </dl>
          {item.instructions && <p className="interview-instructions">{item.instructions}</p>}
          <div className="interview-card-actions"><Link href={`/candidate/applications/${item.applicationId}`} className="interview-details-link">View Details <span aria-hidden="true">→</span></Link>{item.meetingLink && item.status === "SCHEDULED" && <a className="interview-join-link" href={item.meetingLink} target="_blank" rel="noopener noreferrer">Join interview</a>}</div>
        </article>;
      })}
    </div> : items.length ? <div className="interviews-empty-filter">No interviews in this category. <Link href="/candidate/interviews">Show all</Link></div> : <div className="interviews-empty">
      <div className="interviews-empty-art" aria-hidden="true"><CalendarIcon /><i>✦</i><b>✦</b></div>
      <h2>No more interviews</h2><p>You don’t have any other interviews scheduled yet.</p>
    </div>}
  </section>;
}
