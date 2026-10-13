import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { listPublicPositions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const positions = await listPublicPositions({ limit: 200 }).catch(() => []);
  return [
    ...["", "/about", "/jobs", "/faq", "/contact"].map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "weekly" as const })),
    ...positions.map((p: any) => ({ url: `${SITE.url}/jobs/${p._id}`, lastModified: p.updatedAt })),
  ];
}
