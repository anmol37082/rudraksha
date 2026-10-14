import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listPublicPositions } from "@/lib/data";
import { EMPLOYMENT_LABEL, EMPLOYMENT_TYPES } from "@/lib/constants";
import { PositionCard } from "@/components/PositionCard";
import { Button, EmptyState, Input, Select } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Open positions", description: "Browse open wedding and event staff positions and apply online." };

export default async function Jobs({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; sort?: string }> }) {
  const { q = "", type = "", sort = "latest" } = await searchParams;
  const items = await listPublicPositions({ q, type, sort });
  return (
    <main className="jobs-page mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="jobs-mobile-header">
        <Link href="/" aria-label="Rudraksha Events"><Image src="/RUDRAKSHA.png" alt="Rudraksha Events" width={90} height={70} priority /></Link>
        <nav aria-label="Account"><Link href="/candidate/notifications" aria-label="Notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><i /></Link><Link href="/candidate/profile" aria-label="My profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></Link></nav>
      </header>
      <header className="jobs-heading"><h1>Open Positions</h1><p>Find your next opportunity</p><span aria-hidden="true"><i />✦</span></header>
      <form className="jobs-search-form" role="search">
        <label className="jobs-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></svg><Input name="q" defaultValue={q} placeholder="Search by title or location" aria-label="Search positions" className="!w-full sm:!w-64" /></label>
        <label className="jobs-type-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/></svg><Select name="type" defaultValue={type} aria-label="Employment type" className="!w-full sm:!w-44">
          <option value="">All types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
        </Select></label>
        <Button type="submit" className="jobs-search-button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></svg>Search</Button>
      </form>
      <div className="jobs-results-toolbar"><p>{items.length} Open Position{items.length === 1 ? "" : "s"}</p><form method="get" className="jobs-sort-form"><input type="hidden" name="q" value={q} /><input type="hidden" name="type" value={type} /><label htmlFor="jobs-sort">Sort by</label><Select id="jobs-sort" name="sort" defaultValue={sort} aria-label="Sort positions"><option value="latest">Latest</option><option value="oldest">Oldest</option></Select><button type="submit" aria-label="Apply sort">⌄</button></form></div>
      <div className="jobs-position-list mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((p: any) => <PositionCard key={p._id} p={p} />)}</div>
      {!items.length && <EmptyState title="No positions match" text="Try a different search, or check back soon. New roles are posted regularly." />}
    </main>
  );
}
