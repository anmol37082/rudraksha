import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import { LinkButton } from "@/components/ui";

const links = [["/about", "About"], ["/jobs", "Positions"], ["/faq", "FAQ"], ["/contact", "Contact"]];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gold-500/35 bg-forest-900 text-pearl shadow-sm shadow-forest-900/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" aria-label={SITE.name} className="shrink-0">
            <span className="brand-logo-plaque"><Image src="/RUDRAKSHA.png" alt={SITE.name} width={160} height={160} priority className="h-20 w-auto object-contain sm:h-24" /></span>
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-5 overflow-x-auto text-sm font-medium text-pearl/90 sm:order-none sm:w-auto">
            {links.map(([h, l]) => <Link key={h} href={h} className="shrink-0 transition-colors hover:text-gold-500">{l}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            {s ? (
              <LinkButton small variant="gold" href={s.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard"}>My dashboard</LinkButton>
            ) : (
              <>
                <LinkButton small variant="outline" className="border-white/30 bg-white/5 text-pearl hover:bg-white/10" href="/login">Log in</LinkButton>
                <LinkButton small variant="gold" href="/register">Register</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer mt-20 border-t border-gold-500/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <span className="brand-logo-plaque"><Image src="/RUDRAKSHA.png" alt={SITE.name} width={160} height={160} className="h-20 w-auto object-contain" /></span>
            <p className="mt-2 text-sm text-stone-700">{SITE.tagline}. We hire permanent staff for weddings and events.</p>
          </div>
          <div className="text-sm">
            <p className="mb-2 text-gold-700">Explore</p>
            <ul className="space-y-1">{links.map(([h, l]) => <li key={h}><Link href={h} className="hover:text-gold-300">{l}</Link></li>)}</ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 text-gold-700">Contact</p>
            <p>{SITE.email}</p><p>{SITE.phone}</p><p>{SITE.address}</p>
            <Link href="/admin/login" className="mt-3 inline-block text-xs text-stone-600 hover:text-gold-700">Staff login</Link>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs text-pearl/70">© {new Date().getFullYear()} {SITE.name}</p>
      </footer>
    </>
  );
}
