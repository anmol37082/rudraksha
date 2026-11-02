// Usage: ADMIN_SEED_PASSWORD=<secret> npm run seed:admin -- admin@example.com [Admin Name]
// Creates or resets the admin account; the password is never printed.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { requireAdminSeedPassword } from "../lib/admin-seed-password.mjs";

const [email, name = "Administrator"] = process.argv.slice(2);
const password = requireAdminSeedPassword(process.env.ADMIN_SEED_PASSWORD);
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing (put it in .env or .env.local)");
if (!email) {
  console.error("Usage: npm run seed:admin -- <email> [Admin Name]");
  process.exit(1);
}
const normalizedEmail = email.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Enter a valid email address");

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection("users");
const passwordHash = await bcrypt.hash(password, 12);
const now = new Date();
await users.updateOne(
  { email: normalizedEmail },
  { $set: { name, passwordHash, role: "ADMIN", isActive: true, updatedAt: now }, $setOnInsert: { email: normalizedEmail, phone: "0000000000", createdAt: now } },
  { upsert: true }
);
console.log(`Admin ready: ${normalizedEmail}`);
await mongoose.disconnect();
