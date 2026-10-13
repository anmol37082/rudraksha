import { ApiError, handle, ok, oid, requireAuth } from "@/lib/api";
import { Notification } from "@/models";

export const PUT = handle(async (_req, { params }) => {
  const user = await requireAuth();
  const id = oid((await params).id);
  const n = await Notification.findOneAndUpdate({ _id: id, userId: user._id }, { isRead: true });
  if (!n) throw new ApiError(404, "Notification not found");
  return ok({}, "Marked as read");
});
