import { handle, ok, requireAuth } from "@/lib/api";

export const GET = handle(async () => {
  const u = await requireAuth();
  return ok({ id: String(u._id), name: u.name, email: u.email, phone: u.phone, role: u.role });
});
