import { NextRequest, NextResponse } from "next/server";

// Edge-compatible JWT (HS256) check using Web Crypto. This is only the first gate:
// every API route and server page re-verifies the session and role independently.
async function verify(token: string): Promise<{ role?: string } | null> {
  const secret = process.env.JWT_SECRET;
  const [h, p, s] = token.split(".");
  if (!secret || !h || !p || !s) return null;
  try {
    const b64 = (v: string) => Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(v.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!(await crypto.subtle.verify("HMAC", key, b64(s), new TextEncoder().encode(`${h}.${p}`)))) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64(p)));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const session = token ? await verify(token) : null;
  const isAdminArea = pathname.startsWith("/admin");

  if (pathname === "/admin/login") {
    return session?.role === "ADMIN" ? NextResponse.redirect(new URL("/admin/dashboard", req.url)) : NextResponse.next();
  }
  if (!session) {
    const url = new URL(isAdminArea ? "/admin/login" : "/login", req.url);
    if (!isAdminArea) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (isAdminArea && session.role !== "ADMIN") return NextResponse.redirect(new URL("/candidate/dashboard", req.url));
  if (!isAdminArea && session.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/candidate/:path*"] };
