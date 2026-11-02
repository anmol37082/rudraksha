import mongoose from "mongoose";

// Cached connection: survives hot reloads in dev and warm invocations on Vercel.
const g = globalThis as unknown as { _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
const cached = (g._mongoose ??= { conn: null, promise: null });

export function mongoConnectionOptions(nodeEnv = process.env.NODE_ENV) {
  return { bufferCommands: false, autoIndex: nodeEnv !== "production" } as const;
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }
  const promise = cached.promise ??= mongoose.connect(uri, mongoConnectionOptions());
  try {
    cached.conn = await promise;
    if (cached.promise === promise) cached.promise = null;
    return cached.conn;
  } catch (e) {
    if (cached.promise === promise) cached.promise = null;
    cached.conn = null;
    throw e;
  }
}
