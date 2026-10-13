import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPosition, isOpen } from "@/lib/data";
import { DOCUMENT_LABEL, EMPLOYMENT_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";
import { Badge, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await findPosition((await params).id);
  return p && p.status === "ACTIVE" ? { title: p.title, description: p.description.slice(0, 155) } : { title: "Position", robots: { index: false } };
}

const List = ({ title, items }: { title: string; items?: string[] }) =>
  items?.length ? (
    <section className="mt-8">
      <h2 className="text-2xl">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-stone-700">{items.map((i) => <li key={i}>{i}</li>)}</ul>
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
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <article>
        <h1 className="text-4xl">{p.title}</h1>
        <p className="mt-4 whitespace-pre-line text-stone-700 leading-relaxed">{p.description}</p>
        <List title="Responsibilities" items={p.responsibilities} />
        <List title="Requirements" items={p.requirements} />
        <List title="Skills" items={p.skills} />
        {p.requiredDocuments?.length > 0 && <List title="Documents you will need" items={p.requiredDocuments.map((d: string) => DOCUMENT_LABEL[d])} />}
      </article>
      <aside className="card h-fit lg:sticky lg:top-20">
        <dl className="space-y-3 text-sm">
          {facts.map(([k, v]) => <div key={k}><dt className="text-stone-500">{k}</dt><dd className="font-medium text-forest-900">{v}</dd></div>)}
        </dl>
        <div className="mt-6">
          {open ? <LinkButton className="w-full" href={`/candidate/apply/${p._id}`}>Apply now</LinkButton> : <div className="text-center"><Badge status="CLOSED" label="Applications closed" /></div>}
        </div>
      </aside>
    </main>
  );
}
