// Usage: npm run seed:admin -- admin@example.com [password | --generate] [Admin Name]
// Creates (or resets) the admin account. Omit the password or pass --generate to create one.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const [email, passwordArg, name = "Administrator"] = process.argv.slice(2);
const generatedPassword = !passwordArg || passwordArg === "--generate";
const password = generatedPassword ? randomBytes(24).toString("base64url") : passwordArg;
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing (put it in .env or .env.local)");
if (!email || (!generatedPassword && password.length < 10)) {
  console.error("Usage: npm run seed:admin -- <email> [password (10+ chars) | --generate] [name]");
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
if (generatedPassword) console.log(`Generated password: ${password}`);
await mongoose.disconnect();
