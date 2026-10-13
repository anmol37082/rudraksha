import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { Application, Notification } from "@/models";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage("ADMIN");
  const [unread, fresh] = await Promise.all([Notification.countDocuments({ userId: user._id, isRead: false }), Application.countDocuments({ status: "NEW" })]);
  return (
    <Shell area="Admin" who={user.name.split(" ")[0]} items={[
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/applications", label: "Applications", badge: fresh },
      { href: "/admin/candidates", label: "Candidates" },
      { href: "/admin/positions", label: "Positions" },
      { href: "/admin/interviews", label: "Interviews" },
      { href: "/admin/staff", label: "Staff" },
      { href: "/admin/notifications", label: "Notifications", badge: unread },
      { href: "/admin/settings", label: "Account settings" },
    ]}>{children}</Shell>
  );
}
