import Link from "next/link";
import { listPublicPositions } from "@/lib/data";
import { SITE } from "@/lib/site";
import { LinkButton } from "@/components/ui";
import { PositionCard } from "@/components/PositionCard";
import { EMPLOYMENT_LABEL } from "@/lib/constants";
import { FAQS } from "@/lib/site";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const why = [
  ["A professional crew", "Work alongside experienced event hosts, coordinators and service staff who take pride in how a day runs."],
  ["Regular, planned work", "Permanent roles with a roster, not one-off gigs. You know your schedule ahead of time."],
  ["Training from day one", "Grooming, guest etiquette, service standards and safety are taught before your first event."],
  ["Room to grow", "Team leads and coordinators are promoted from within the crew."],
];
const steps = ["Find a position", "Register", "Apply", "Interview", "Get selected"];

export default async function Home() {
  const [positions, session] = await Promise.all([
    listPublicPositions({ limit: 6 }).catch(() => []),
    getSession(),
  ]);
  const applyHref = session?.role === "ADMIN" ? "/admin/dashboard" : session ? "/jobs" : "/register";
  return (
    <main>
      <section className="hero-brand">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">Join our wedding &amp; event team</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pearl/85">
              {SITE.name} looks after guests at weddings and events, from the first arrival to the last goodbye. We are hiring permanent staff who are warm, punctual and proud of good service.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton variant="gold" href="/jobs">View positions</LinkButton>
              <LinkButton variant="outline" href={applyHref} className="border-white/30 bg-white/5 text-pearl hover:bg-white/10">Apply now</LinkButton>
            </div>
          </div>
          <aside aria-label="Latest openings" className="place-card rounded-[14px] p-6 text-forest-900 shadow-xl">
            <p className="font-serif text-lg">Seats open at our table</p>
            <ul className="mt-3 divide-y divide-gold-300/60">
              {positions.slice(0, 4).map((p: any) => (
                <li key={p._id} className="py-3">
                  <Link href={`/jobs/${p._id}`} className="font-medium hover:text-gold-700">{p.title}</Link>
                  <p className="text-sm text-stone-600">{p.location} · {EMPLOYMENT_LABEL[p.employmentType]}</p>
                </li>
              ))}
              {!positions.length && <li className="py-3 text-sm text-stone-600">No positions are open right now. Please check back soon.</li>}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 bg-pearl px-4 py-16 text-forest-900 md:grid-cols-2">
        <div>
          <h2 className="text-3xl">Who we are</h2>
          <p className="mt-4 text-stone-700 leading-relaxed">
            We are a team of event attendants and hosts who work at weddings, receptions and celebrations. Our clients trust us because our people are calm under pressure, kind to guests and quick to help. We hire for attitude first and teach the rest.
          </p>
          <Link href="/about" className="mt-4 inline-block text-sm font-medium text-forest-700 underline underline-offset-4">Read more about us</Link>
        </div>
        <div>
          <h2 className="text-3xl">What we look for</h2>
          <ul className="mt-4 space-y-2 text-stone-700">
            {["Aged 18 or above, with valid identity proof", "Neat, presentable and comfortable standing for long hours", "Available on weekends, evenings and festival seasons", "Good communication and a team-first attitude", "Previous event or hospitality experience is helpful but not required"].map((r) => (
              <li key={r} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />{r}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-forest-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl">Why join us</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {why.map(([t, d]) => (
              <div key={t} className="border-t-2 border-gold-500 pt-4">
                <h3 className="text-lg">{t}</h3>
                <p className="mt-2 text-sm text-stone-700">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl bg-pearl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl">Open positions</h2>
          <Link href="/jobs" className="text-sm font-medium text-forest-700 underline underline-offset-4">See all positions</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {positions.slice(0, 3).map((p: any) => <PositionCard key={p._id} p={p} />)}
        </div>
        {!positions.length && <p className="mt-6 text-stone-600">There are no open positions at the moment.</p>}
      </section>

      <section className="bg-forest-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s} className="rounded-lg bg-white p-4 shadow-sm">
                <span className="font-serif text-2xl text-gold-700">{i + 1}</span>
                <p className="mt-1 font-medium text-forest-900">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl bg-pearl px-4 py-16">
        <h2 className="text-3xl">Common questions</h2>
        <div className="mt-6 divide-y divide-forest-100 rounded-lg border border-forest-100 bg-white">
          {FAQS.slice(0, 4).map(([q, a]) => (
            <details key={q} className="group p-4"><summary className="cursor-pointer font-medium text-forest-900">{q}</summary><p className="mt-2 text-sm text-stone-700">{a}</p></details>
          ))}
        </div>
        <Link href="/faq" className="mt-4 inline-block text-sm font-medium text-forest-700 underline underline-offset-4">All questions</Link>
      </section>

      <section className="mx-4">
        <div className="mx-auto max-w-6xl rounded-lg border border-gold-500/30 bg-forest-100 px-6 py-12 text-center shadow-sm">
          <h2 className="text-3xl">Ready to join our team?</h2>
          <p className="mx-auto mt-2 max-w-md text-forest-700">Create an account, complete your profile and apply in a few minutes.</p>
          <div className="mt-6"><LinkButton variant="gold" href={applyHref}>Apply now</LinkButton></div>
        </div>
      </section>
    </main>
  );
}
