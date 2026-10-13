import { redirect } from "next/navigation";
import { Role } from "./auth";
import { ApiError, requireAuth } from "./api";

/** Server-component guard: verifies session AND the live user record. */
export async function requirePage(role: Role) {
  const loginPath = role === "ADMIN" ? "/admin/login" : "/login";
  let user;
  try {
    user = await requireAuth();
  } catch (e) {
    // Only auth failures (401/403) go to login; real errors (e.g. DB down) must surface.
    if (e instanceof ApiError) redirect(loginPath);
    throw e;
  }
  // Signed in, but on the wrong panel: send them to their own dashboard.
  if (user.role !== role) redirect(user.role === "ADMIN" ? "/admin/dashboard" : "/candidate/dashboard");
  // Plain object (like the old .lean() result) so it is safe to pass to Client Components.
  return user.toObject();
}
