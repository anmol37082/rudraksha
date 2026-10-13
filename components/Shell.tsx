import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";
import { SITE } from "@/lib/site";

export type NavItem = { href: string; label: string; badge?: number };

/** Sidebar on desktop, scrolling tab bar on mobile. Shared by candidate and admin areas. */
export function Shell({ items, who, area, children }: { items: NavItem[]; who: string; area: string; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-gold-500/35 bg-forest-900 text-pearl print:hidden lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-gold-500/30">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-5 lg:py-6">
          <Link href="/" aria-label={SITE.name} className="inline-block">
            <span className="brand-logo-plaque"><Image src="/RUDRAKSHA.png" alt={SITE.name} width={160} height={160} className="h-14 w-auto object-contain" /></span>
          </Link>
          <p className="text-xs text-pearl/70 lg:mt-2">{area} · {who}</p>
        </div>
        <nav aria-label={`${area} navigation`} className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-1 lg:px-3">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="flex shrink-0 items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-sm text-pearl/90 transition-colors hover:bg-forest-700 hover:text-white">
              {i.label}
              {!!i.badge && <span className="rounded-full bg-gold-500 px-1.5 text-xs font-medium text-forest-900">{i.badge}</span>}
            </Link>
          ))}
          <LogoutButton to={area === "Admin" ? "/admin/login" : "/"} className="shrink-0 rounded-[10px] px-3 py-2 text-left text-sm text-pearl/90 transition-colors hover:bg-forest-700 lg:w-full" />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 print:px-0 print:py-0 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
