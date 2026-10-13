// Usage: npm run seed:admin -- admin@example.com 'StrongPassword123' 'Admin Name'
// Creates (or resets the password of) an admin account. Nothing is hardcoded.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const [email, password, name = "Administrator"] = process.argv.slice(2);
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set (put it in .env.local)");
if (!email || !password || password.length < 10) {
  console.error("Usage: npm run seed:admin -- <email> <password (10+ chars)> [name]");
  process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.collection("users");
const passwordHash = await bcrypt.hash(password, 12);
const now = new Date();
await users.updateOne(
  { email: email.toLowerCase() },
  { $set: { name, passwordHash, role: "ADMIN", isActive: true, updatedAt: now }, $setOnInsert: { email: email.toLowerCase(), phone: "0000000000", createdAt: now } },
  { upsert: true }
);
console.log(`Admin ready: ${email}`);
await mongoose.disconnect();
