import { Service } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { ServiceCatalog } from "@/components/ServiceCatalog";
import { connectDB } from "@/lib/mongodb";
export default async function ServicesPage() { await connectDB(); const services = plain(await Service.find().sort({ category: 1, name: 1 }).lean()) as any[]; return <><PageTitle title="Service catalogue" /><p className="mb-5 text-sm text-stone-600">Catalogue entries are not included in any event scope until selected in a quotation.</p><ServiceCatalog initial={services} /></>; }
