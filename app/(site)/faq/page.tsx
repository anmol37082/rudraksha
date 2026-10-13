import type { Metadata } from "next";
import { FAQS } from "@/lib/site";

export const metadata: Metadata = { title: "Frequently asked questions" };

export default function Faq() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-forest-100 rounded-lg border border-forest-100 bg-white">
        {FAQS.map(([q, a]) => (
          <details key={q} className="p-5"><summary className="cursor-pointer font-medium text-forest-900">{q}</summary><p className="mt-2 text-stone-700">{a}</p></details>
        ))}
      </div>
    </main>
  );
}
