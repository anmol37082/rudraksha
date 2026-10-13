import { requirePage } from "@/lib/guard";
import { Notification } from "@/models";
import { plain } from "@/lib/api";
import { PageTitle } from "@/components/ui";
import { NotificationList } from "@/components/NotificationList";

export default async function Notifications() {
  const user = await requirePage("CANDIDATE");
  const items = plain(await Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean());
  return (<><PageTitle title="Notifications" /><NotificationList initial={items} /></>);
}
