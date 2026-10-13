import Link from "next/link";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import type { ComponentProps, ReactNode } from "react";

export function Button({ variant = "primary", small, className = "", ...p }: ComponentProps<"button"> & { variant?: "primary" | "gold" | "outline" | "danger"; small?: boolean }) {
  return <button className={`btn-${variant} ${small ? "btn-sm" : ""} ${className}`} {...p} />;
}

export function LinkButton({ variant = "primary", small, className = "", ...p }: ComponentProps<typeof Link> & { variant?: "primary" | "gold" | "outline"; small?: boolean }) {
  return <Link className={`btn-${variant} ${small ? "btn-sm" : ""} ${className}`} {...p} />;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

export const Input = (p: ComponentProps<"input">) => <input {...p} className={`input ${p.className ?? ""}`} />;
export const Textarea = (p: ComponentProps<"textarea">) => <textarea rows={4} {...p} className={`input ${p.className ?? ""}`} />;
export const Select = (p: ComponentProps<"select">) => <select {...p} className={`input ${p.className ?? ""}`} />;

export const Card = ({ className = "", ...p }: ComponentProps<"div">) => <div className={`card ${className}`} {...p} />;

export function Badge({ status, label }: { status: string; label?: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? "bg-stone-100 text-stone-700"}`}>{label ?? STATUS_LABEL[status] ?? status}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gold-500/40 bg-white px-6 py-12 text-center">
      <p className="font-serif text-lg text-forest-900">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Loader = () => <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" role="status" aria-label="Loading" />;

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gold-500/30 bg-white shadow-sm shadow-forest-900/5">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-gold-500/25 bg-forest-50"><tr>{head.map((h, index) => <th key={`${h}-${index}`} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-forest-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Server-rendered pagination that keeps the current filters. */
export function Pagination({ page, total, limit, path, params }: { page: number; total: number; limit: number; path: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const href = (n: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(n));
    return `${path}?${q}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
      <span>{total} result{total === 1 ? "" : "s"} · page {Math.min(page, pages)} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn-outline btn-sm" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn-outline btn-sm" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export const PageTitle = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl sm:text-3xl">{title}</h1>
    {children}
  </div>
);
