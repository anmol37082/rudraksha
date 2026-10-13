import { requirePage } from "@/lib/guard";
import { plain } from "@/lib/api";
import { Staff } from "@/models";
import { EmptyState, PageTitle } from "@/components/ui";
import { JoiningLetter } from "@/components/JoiningLetter";

export default async function CandidateStaff() {
  const user = await requirePage("CANDIDATE");
  const staff = await Staff.findOne({ candidateId: user._id }).lean();
  if (!staff || !staff.joiningLetter) return <><PageTitle title="My joining letter" /><EmptyState title="Not available yet" text="Your joining letter will appear here after the hiring team records your joining date." /></>;
  const record = plain(staff) as any;
  return <><PageTitle title="My joining letter" /><JoiningLetter letter={record.joiningLetter} /></>;
}
