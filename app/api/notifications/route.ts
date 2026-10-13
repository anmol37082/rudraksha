import { handle, ok, plain, requireAuth } from "@/lib/api";
import { Notification } from "@/models";

export const GET = handle(async () => {
  const user = await requireAuth();
  const [items, unread] = await Promise.all([
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ userId: user._id, isRead: false }),
  ]);
  return ok({ items: plain(items), unread });
});

// Mark all as read.
export const PUT = handle(async () => {
  const user = await requireAuth();
  await Notification.updateMany({ userId: user._id, isRead: false }, { isRead: true });
  return ok({}, "All notifications marked as read");
});
