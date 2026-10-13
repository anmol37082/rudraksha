import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const COOKIE = "session";
export type Role = "CANDIDATE" | "ADMIN";
export type Session = { id: string; role: Role; name: string };

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET is missing or too short (use 32+ random characters)");
  return s;
}

export function signToken(s: Session) {
  return jwt.sign(s, secret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): Session | null {
  try {
    const p = jwt.verify(token, secret(), { algorithms: ["HS256"] }) as Session;
    return { id: p.id, role: p.role, name: p.name };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}
