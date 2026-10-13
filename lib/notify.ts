import { Types } from "mongoose";
import { AuditLog, Notification, User } from "@/models";

export async function notify(userId: unknown, title: string, message: string, type = "INFO") {
  await Notification.create({ userId, title, message, type });
}

export async function notifyAdmins(title: string, message: string, type = "INFO") {
  const admins = await User.find({ role: "ADMIN", isActive: true }).select("_id").lean();
  if (admins.length) await Notification.insertMany(admins.map((a) => ({ userId: a._id, title, message, type })));
}

/** Runs a side effect (notification/audit) without letting its failure fail the main request. */
export async function bestEffort(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    console.error(`[notify] ${label} failed`, e);
  }
}

export async function audit(adminId: unknown, action: string, targetType: string, targetId: unknown, description = "") {
  await AuditLog.create({ adminId, action, targetType, targetId: targetId ? new Types.ObjectId(String(targetId)) : undefined, description });
}
