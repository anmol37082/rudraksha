import { NextRequest } from "next/server";
import { handle, ok, parseBody, plain, requireAuth } from "@/lib/api";
import { profileSchema } from "@/lib/validators";
import { profileCompletion } from "@/lib/profile";
import { CandidateProfile, User } from "@/models";

async function load(userId: unknown) {
  const profile = (await CandidateProfile.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true }).lean())!;
  return profile;
}

export const GET = handle(async () => {
  const user = await requireAuth("CANDIDATE");
  const profile = await load(user._id);
  return ok(plain({ user: { name: user.name, email: user.email, phone: user.phone }, profile, completion: profileCompletion(user, profile) }));
});

export const PUT = handle(async (req: NextRequest) => {
  const user = await requireAuth("CANDIDATE");
  const { name, phone, dateOfBirth, ...rest } = await parseBody(req, profileSchema);
  if (name || phone) await User.updateOne({ _id: user._id }, { ...(name && { name }), ...(phone && { phone }) });
  const set: Record<string, unknown> = { ...rest, profileSaved: true };
  if (dateOfBirth !== undefined) set.dateOfBirth = dateOfBirth || null;
  const profile = await CandidateProfile.findOneAndUpdate({ userId: user._id }, { $set: set }, { upsert: true, new: true }).lean();
  const fresh = await User.findById(user._id);
  return ok(plain({ profile, completion: profileCompletion(fresh, profile) }), "Profile saved");
});
