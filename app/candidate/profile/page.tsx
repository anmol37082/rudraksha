import { requirePage } from "@/lib/guard";
import { CandidateProfile } from "@/models";
import { plain } from "@/lib/api";
import { isProfileSetupComplete, profileCompletion } from "@/lib/profile";
import { PageTitle } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";

export default async function Profile() {
  const user = await requirePage("CANDIDATE");
  const profile = plain((await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true, new: true }).lean())!);
  const plainUser = plain(user);
  return (
    <>
      <PageTitle title="My profile" />
      <div className="candidate-profile-page max-w-4xl"><ProfileForm user={plainUser} profile={profile} setupComplete={isProfileSetupComplete(user, profile)} completion={profileCompletion(user, profile)} /></div>
    </>
  );
}
