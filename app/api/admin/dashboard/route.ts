import { handle, ok, requireAuth } from "@/lib/api";
import { adminStats } from "@/lib/data";

export const GET = handle(async () => {
  await requireAuth("ADMIN");
  return ok(await adminStats());
});
