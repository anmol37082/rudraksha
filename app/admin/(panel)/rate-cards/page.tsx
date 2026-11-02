import { RateCard } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { RateCardManager } from "@/components/RateCardManager";
export default async function RateCardsPage() { const rates = plain(await RateCard.find().sort({ role: 1, version: -1 }).lean()) as any[]; return <><PageTitle title="Manpower rate cards" /><p className="mb-5 text-sm text-stone-600">Only enter business-approved rates. New effective versions preserve the price captured in existing quotations.</p><RateCardManager initial={rates} /></>; }
