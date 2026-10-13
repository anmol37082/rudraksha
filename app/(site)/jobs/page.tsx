import type { Metadata } from "next";
import { listPublicPositions } from "@/lib/data";
import { EMPLOYMENT_LABEL, EMPLOYMENT_TYPES } from "@/lib/constants";
import { PositionCard } from "@/components/PositionCard";
import { Button, EmptyState, Input, Select } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Open positions", description: "Browse open wedding and event staff positions and apply online." };

export default async function Jobs({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "" } = await searchParams;
  const items = await listPublicPositions({ q, type });
  return (
    <main className="jobs-page mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-3xl sm:text-4xl">Open positions</h1>
      <form className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by title or location" aria-label="Search positions" className="!w-full sm:!w-64" />
        <Select name="type" defaultValue={type} aria-label="Employment type" className="!w-full sm:!w-44">
          <option value="">All types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
        </Select>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">Search</Button>
      </form>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((p: any) => <PositionCard key={p._id} p={p} />)}</div>
      {!items.length && <EmptyState title="No positions match" text="Try a different search, or check back soon. New roles are posted regularly." />}
    </main>
  );
}
