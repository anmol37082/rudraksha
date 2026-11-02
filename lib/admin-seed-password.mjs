export function requireAdminSeedPassword(password) {
  if (typeof password !== "string" || password.length < 10) {
    throw new Error("Set ADMIN_SEED_PASSWORD to a password with at least 10 characters before running the admin seed command");
  }
  return password;
}
