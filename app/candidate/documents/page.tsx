import { requirePage } from "@/lib/guard";
import { CandidateProfile } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { DocumentsManager } from "@/components/DocumentsManager";

export default async function Documents() {
  const user = await requirePage("CANDIDATE");
  const profile = await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true }).lean();
  return <><PageTitle title="My documents" /><DocumentsManager profile={plain(profile)} /></>;
}
