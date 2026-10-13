import { requirePage } from "@/lib/guard";
import { CandidateProfile } from "@/models";
import { plain } from "@/lib/api";
import { profileCompletion } from "@/lib/profile";
import { PageTitle } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";

export default async function Profile() {
  const user = await requirePage("CANDIDATE");
  const profile = plain((await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true }).lean())!);
  return (
    <>
      <PageTitle title="My profile" />
      <div className="max-w-4xl"><ProfileForm user={plain(user)} profile={profile} completion={profileCompletion(user, profile)} /></div>
    </>
  );
}
