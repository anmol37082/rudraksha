import { requirePage } from "@/lib/guard";
import { CandidateProfile } from "@/models";
import { plain } from "@/lib/api";
import { DocumentsManager } from "@/components/DocumentsManager";

export default async function Documents() {
  const user = await requirePage("CANDIDATE");
  const profile = await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true }).lean();
  return <>
    <header className="documents-heading"><h1>My Documents</h1><p>Upload and manage your documents.</p><span aria-hidden="true"><i />✦</span></header>
    <DocumentsManager profile={plain(profile)} />
  </>;
}
