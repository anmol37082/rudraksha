import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { PageTitle } from "@/components/ui";

const actions = [
  { href: "/jobs", label: "Positions", icon: "briefcase", color: "text-[#164332]" },
  { href: "/candidate/applications", label: "Applications", icon: "application", color: "text-[#90713B]" },
  { href: "/candidate/profile", label: "My profile", icon: "profile", color: "text-[#164332]" },
  { href: "/candidate/documents", label: "Documents", icon: "document", color: "text-[#09251B]" },
  { href: "/candidate/interviews", label: "Interviews", icon: "calendar", color: "text-[#164332]" },
  { href: "/contact", label: "Help & support", icon: "support", color: "text-[#90713B]" },
];

function AppIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "briefcase": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="7.5" width="17" height="13" rx="2.5" /><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3.5 12h17M10 12v2h4v-2" /></svg>;
    case "application": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M8 4.5h8a2 2 0 0 1 2 2v13H6v-13a2 2 0 0 1 2-2Z" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 17h3" /></svg>;
    case "profile": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
    case "document": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5v5h5M9 13h6M9 17h6" /></svg>;
    case "calendar": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M3.5 10h17M8 14h2M14 14h2M8 17h2" /></svg>;
    default: return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H6a2 2 0 0 1-2-2v-4ZM20 13h-3v6h1a2 2 0 0 0 2-2v-4ZM17 19a5 5 0 0 1-5 2" /></svg>;
  }
}

export default async function Dashboard() {
  const user = await requirePage("CANDIDATE");
  return <>
    <PageTitle title={`Hello, ${user.name.split(" ")[0]}`} />
    <section aria-label="Candidate services" className="grid grid-cols-3 gap-x-2 gap-y-5 sm:gap-x-5 sm:gap-y-7">
      {actions.map((action) => <Link key={action.href} href={action.href} aria-label={action.label} className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl py-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 active:scale-95">
        <span className={`grid h-14 w-14 place-items-center ${action.color} transition-transform group-hover:scale-105 sm:h-16 sm:w-16`}><AppIcon name={action.icon} /></span>
        <span className="max-w-24 text-xs font-semibold leading-tight text-forest-900 sm:text-sm">{action.label}</span>
      </Link>)}
    </section>
    <p className="mt-6 hidden text-center text-xs text-stone-500 sm:block">Your applications and documents are visible only to you and the hiring team.</p>
  </>;
}
