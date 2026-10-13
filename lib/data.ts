import { connectDB } from "./mongodb";
import { escapeRegex, plain } from "./api";
import { ApiError } from "./api";
import { Application, CandidateProfile, Interview, Position, Staff, User } from "@/models";
import mongoose from "mongoose";

export const isOpen = (p: { status: string; applicationDeadline?: Date | string | null }) =>
  p.status === "ACTIVE" && (!p.applicationDeadline || new Date(p.applicationDeadline).getTime() + 86_399_000 >= Date.now());

export async function findPosition(idOrSlug: string) {
  await connectDB();
  const q = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const p = await Position.findOne(q).lean();
  return p ? plain(p) : null;
}

export async function listPublicPositions({ q = "", type = "", limit = 50 }: { q?: string; type?: string; limit?: number } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = { status: "ACTIVE" };
  if (type) filter.employmentType = type;
  if (q) filter.$or = [{ title: new RegExp(escapeRegex(q), "i") }, { location: new RegExp(escapeRegex(q), "i") }];
  const items = await Position.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return plain(items).filter(isOpen);
}

export async function adminStats() {
  await connectDB();
  const count = (s: string) => Application.countDocuments({ status: s });
  const [candidates, newApps, review, shortlisted, interviews, selected, rejected, positions, staff] = await Promise.all([
    User.countDocuments({ role: "CANDIDATE" }), count("NEW"), count("UNDER_REVIEW"), count("SHORTLISTED"),
    Interview.countDocuments({ status: "SCHEDULED", date: { $gte: new Date(Date.now() - 86_400_000) } }),
    count("SELECTED"), count("REJECTED"), Position.countDocuments({ status: "ACTIVE" }), Staff.countDocuments({ status: "ACTIVE" }),
  ]);
  const recent = await Application.find().sort({ createdAt: -1 }).limit(6).populate("candidateId", "name").populate("positionId", "title").lean();
  const upcoming = await Interview.find({ status: "SCHEDULED", date: { $gte: new Date(Date.now() - 86_400_000) } })
    .sort({ date: 1 }).limit(6).populate("candidateId", "name").populate("positionId", "title").lean();
  return plain({ stats: { candidates, newApps, review, shortlisted, interviews, selected, rejected, positions, staff }, recent, upcoming });
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function listApplications(sp: SP, page: number, limit: number) {
  await connectDB();
  const f: Record<string, any> = {};
  if (one(sp.status)) f.status = one(sp.status);
  if (one(sp.position) && mongoose.isValidObjectId(one(sp.position))) f.positionId = one(sp.position);
  if (one(sp.from) || one(sp.to)) {
    const from = one(sp.from);
    const to = one(sp.to);
    const isDate = (v: string) => v === "" || !isNaN(Date.parse(v));
    if (!isDate(from) || !isDate(to)) throw new ApiError(422, "Invalid date range");
    f.appliedAt = {};
    if (from) f.appliedAt.$gte = new Date(from);
    if (to) f.appliedAt.$lte = new Date(to + "T23:59:59");
  }
  if (one(sp.q)) {
    const re = new RegExp(escapeRegex(one(sp.q)), "i");
    // distinct() returns only ids, so no arbitrary cap is needed (previously limited to 200, silently dropping matches).
    const ids = await User.distinct("_id", { role: "CANDIDATE", $or: [{ name: re }, { email: re }, { phone: re }] });
    f.candidateId = { $in: ids };
  }
  const [items, total] = await Promise.all([
    Application.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select("-adminNotes").populate("candidateId", "name email phone").populate("positionId", "title").lean(),
    Application.countDocuments(f),
  ]);
  return { items: plain(items), total };
}

export async function listCandidates(sp: SP, page: number, limit: number) {
  await connectDB();
  const f: Record<string, any> = { role: "CANDIDATE" };
  if (one(sp.q)) {
    const re = new RegExp(escapeRegex(one(sp.q)), "i");
    f.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const [items, total] = await Promise.all([
    User.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(f),
  ]);
  const profiles = await CandidateProfile.find({ userId: { $in: items.map((i) => i._id) } }).select("userId city").lean();
  const city = new Map(profiles.map((p) => [String(p.userId), p.city]));
  return { items: plain(items.map((u) => ({ ...u, city: city.get(String(u._id)) || "" }))), total };
}

export const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
