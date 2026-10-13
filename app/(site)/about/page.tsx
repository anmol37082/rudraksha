import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "About us", description: `Learn about ${SITE.name} and the team behind every wedding and event we attend.` };

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl">About {SITE.name}</h1>
      <div className="mt-6 space-y-4 text-lg leading-relaxed text-stone-700">
        <p>{SITE.name} provides trained attendants and hosts for weddings and events. Our crew greets guests, manages seating and flow, supports the family and keeps everything running quietly in the background.</p>
        <p>Every person on our team is a permanent member of staff. We invest in training and a steady roster because good service comes from people who know each other and know the work.</p>
        <p>We hire through this website so that every candidate gets the same fair process: apply, be reviewed, interview, and hear back from us.</p>
      </div>
      <div className="mt-8"><LinkButton href="/jobs">See open positions</LinkButton></div>
    </main>
  );
}
