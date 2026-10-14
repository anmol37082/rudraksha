import Link from "next/link";
import { EMPLOYMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, LinkButton } from "./ui";

export function PositionCard({ p }: { p: any }) {
  return (
    <article className="card position-card flex flex-col">
      <div className="position-card-heading">
        <span className="position-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7.5" width="17" height="13" rx="2"/><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3.5 12h17M10 12v2h4v-2"/></svg></span>
        <div className="position-card-title"><h2><Link href={`/jobs/${p._id}`} className="hover:text-gold-700">{p.title}</Link></h2><p>{p.description}</p></div>
        <Badge status="ACTIVE" label={EMPLOYMENT_LABEL[p.employmentType]} />
      </div>
      <dl className="position-facts">
        <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg><span>Location</span></dt><dd>{p.location}</dd></div>
        <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg><span>Experience</span></dt><dd>{p.experienceRequired || "Freshers welcome"}</dd></div>
        <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4m8-4v4M3.5 9.5h17"/></svg><span>Posted</span></dt><dd>{fmtDate(p.createdAt)}</dd></div>
        <div><dt><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Apply by</span></dt><dd>{p.applicationDeadline ? fmtDate(p.applicationDeadline) : "Open until filled"}</dd></div>
      </dl>
      <div className="position-card-actions">
        <LinkButton small variant="outline" href={`/jobs/${p._id}`}>View details</LinkButton>
        <LinkButton small href={`/candidate/apply/${p._id}`}>Apply now <span aria-hidden="true">→</span></LinkButton>
      </div>
    </article>
  );
}
