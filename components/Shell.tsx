"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";
import { SITE } from "@/lib/site";

export type NavItem = { href: string; label: string; badge?: number };

const symbols: Record<string, string> = {
  "/candidate/dashboard": "⌂", "/jobs": "⌕", "/candidate/applications": "▤", "/candidate/profile": "◉",
  "/candidate/documents": "▧", "/candidate/interviews": "◷", "/candidate/notifications": "♢", "/candidate/staff": "▣",
  "/admin/dashboard": "⌂", "/admin/applications": "▤", "/admin/candidates": "♙", "/admin/positions": "⌕",
  "/admin/interviews": "◷", "/admin/staff": "▣", "/admin/notifications": "♢", "/admin/settings": "⚙",
};

export function Shell({ items, who, area, children }: { items: NavItem[]; who: string; area: string; children: ReactNode }) {
  const pathname = usePathname();
  const candidate = area === "Candidate";
  const candidateCompactHeader = candidate;
  const unreadCount = items.find((item) => item.href === "/candidate/notifications")?.badge ?? 0;
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  useEffect(() => {
    if (!adminMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAdminMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [adminMenuOpen]);
  const navLink = (i: NavItem, compact = false, onSelect?: () => void) => {
    const active = pathname === i.href || (i.href !== "/" && pathname.startsWith(`${i.href}/`));
    return <Link key={i.href} href={i.href} onClick={onSelect} aria-label={compact ? i.label : undefined} aria-current={active ? "page" : undefined}
      className={`${compact ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px]" : "flex min-h-11 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm"} ${active ? "bg-forest-700 text-white" : "text-pearl/85 hover:bg-forest-700/70"}`}>
      <span className={compact ? "text-xl leading-6" : "flex items-center gap-3"}>{!compact && <span aria-hidden="true" className="w-5 text-center text-lg">{symbols[i.href] ?? "•"}</span>}{compact && <span aria-hidden="true" className="text-lg">{symbols[i.href] ?? "•"}</span>}{compact ? i.label : <span>{i.label}</span>}</span>
      {!!i.badge && <span className="rounded-full bg-gold-500 px-1.5 text-xs font-medium text-forest-900">{i.badge}</span>}
    </Link>;
  };
  return <div className="min-h-screen lg:flex">
    <aside className="hidden border-r border-forest-100 bg-forest-900 text-pearl print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
      <div className="px-5 py-6"><Link href={candidate ? "/candidate/dashboard" : "/admin/dashboard"} aria-label={SITE.name} className="inline-flex items-center gap-2"><Image src="/RUDRAKSHA.png" alt="" width={72} height={72} className="h-14 w-14 object-contain" /><span className="text-base font-semibold">{SITE.name}</span></Link><p className="mt-2 text-xs text-pearl/65">{area} · {who}</p></div>
      <nav aria-label={`${area} navigation`} className="flex-1 space-y-1 overflow-y-auto px-3">{items.map((i) => navLink(i))}</nav>
      <div className="p-3"><LogoutButton to={candidate ? "/login" : "/admin/login"} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-pearl/85 hover:bg-forest-700" /></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className={`app-mobile-header flex items-center justify-between border-b border-gold-500/35 bg-forest-900 px-4 py-1 text-pearl lg:hidden ${candidateCompactHeader ? "candidate-dashboard-header" : ""}`}>
        <Link href={candidate ? "/candidate/dashboard" : "/admin/dashboard"} aria-label={SITE.name} className="inline-flex items-center gap-2">
          <Image src="/RUDRAKSHA.png" alt="" width={64} height={64} className={candidateCompactHeader ? "h-10 w-12 object-contain" : "h-12 w-12 object-contain"} />
          {!candidateCompactHeader && <span className="app-mobile-brand-name font-serif text-2xl font-semibold text-pearl">{SITE.name}</span>}
        </Link>
        <div className="flex items-center gap-3">
          {candidate && <Link href="/candidate/notifications" className="candidate-header-notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            {unreadCount > 0 && <span>{unreadCount}</span>}
          </Link>}
          {!candidate && <button type="button" className="admin-mobile-menu-button grid h-11 w-11 place-items-center text-pearl" aria-label={adminMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={adminMenuOpen} onClick={() => setAdminMenuOpen((open) => !open)}>
            {adminMenuOpen ? <span aria-hidden="true" className="text-3xl leading-none">×</span> : <span aria-hidden="true" className="grid gap-1"><span className="h-0.5 w-6 rounded bg-current" /><span className="h-0.5 w-6 rounded bg-current" /><span className="h-0.5 w-6 rounded bg-current" /></span>}
          </button>}
          {candidate && <LogoutButton to="/login" className="candidate-dashboard-logout" />}
        </div>
      </header>
      {!candidate && adminMenuOpen && <div className="fixed inset-0 z-50 lg:hidden">
        <button type="button" aria-label="Close navigation menu" className="absolute inset-0 bg-forest-900/45" onClick={() => setAdminMenuOpen(false)} />
        <nav aria-label="Admin navigation" className="admin-drawer absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-forest-900 px-4 pb-6 pt-5 text-pearl shadow-2xl shadow-forest-900/30">
          <div className="mb-5 flex items-center justify-between border-b border-gold-500/30 pb-4">
            <span className="font-serif text-xl">Menu</span>
            <button type="button" className="grid h-10 w-10 place-items-center text-2xl" aria-label="Close navigation menu" onClick={() => setAdminMenuOpen(false)}>×</button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">{items.map((i) => navLink(i, false, () => setAdminMenuOpen(false)))}</div>
          <LogoutButton to="/admin/login" className="mt-4 w-full rounded-xl border border-gold-500/30 px-3 py-3 text-left text-sm text-pearl hover:bg-forest-700" />
        </nav>
      </div>}
      <main className={`mx-auto w-full max-w-6xl px-4 py-5 print:px-0 print:py-0 sm:px-6 sm:py-7 lg:px-8 ${candidate ? "candidate-content" : "admin-content"}`}>{children}</main>
    </div>
  </div>;
}
