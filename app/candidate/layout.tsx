import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { Notification } from "@/models";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("CANDIDATE");
  const unread = await Notification.countDocuments({ userId: user._id, isRead: false });
  return (
    <Shell area="Candidate" who={user.name.split(" ")[0]} items={[
      { href: "/candidate/dashboard", label: "Home" },
      { href: "/jobs", label: "Positions" },
      { href: "/candidate/applications", label: "Applications" },
      { href: "/candidate/profile", label: "Profile" },
      { href: "/candidate/documents", label: "Documents" },
      { href: "/candidate/interviews", label: "Interviews" },
      { href: "/contact", label: "Help & support" },
      { href: "/candidate/notifications", label: "Notifications", badge: unread },
      { href: "/candidate/staff", label: "My joining letter" },
    ]}>{children}</Shell>
  );
}
