import Link from "next/link";
import { EMPLOYMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, LinkButton } from "./ui";

export function PositionCard({ p }: { p: any }) {
  return (
    <article className="card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl"><Link href={`/jobs/${p._id}`} className="hover:text-gold-700">{p.title}</Link></h3>
        <Badge status="ACTIVE" label={EMPLOYMENT_LABEL[p.employmentType]} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-600">{p.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-stone-500">Location</dt><dd>{p.location}</dd>
        <dt className="text-stone-500">Experience</dt><dd>{p.experienceRequired || "Freshers welcome"}</dd>
        <dt className="text-stone-500">Posted</dt><dd>{fmtDate(p.createdAt)}</dd>
        <dt className="text-stone-500">Apply by</dt><dd>{p.applicationDeadline ? fmtDate(p.applicationDeadline) : "Open until filled"}</dd>
      </dl>
      <div className="mt-5 flex gap-2">
        <LinkButton small variant="outline" href={`/jobs/${p._id}`}>View details</LinkButton>
        <LinkButton small href={`/candidate/apply/${p._id}`}>Apply now</LinkButton>
      </div>
    </article>
  );
}
