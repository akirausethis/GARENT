import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "garent_session";
const DEFAULT_SECRET = "garent-super-secret-jwt-signing-key-32chars-min!";
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || DEFAULT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get("garasiku_session")?.value;

  let session: { role: string; statusVerifikasi: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      session = {
        role: String(payload.role || "").toLowerCase(),
        statusVerifikasi: String(payload.statusVerifikasi || "").toLowerCase(),
      };
    } catch {
      session = null;
    }
  }

  // 1. Lindungi seluruh rute Admin (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Lindungi rute Penyewa (/penyewa/*)
  if (pathname.startsWith("/penyewa")) {
    if (!session || session.role !== "penyewa") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Jika sudah login dan mengakses /login atau /register
  if (pathname === "/login" || pathname === "/register") {
    if (session) {
      if (session.role === "admin") {
        return NextResponse.redirect(new URL("/admin/garasi", req.url));
      }
      if (session.role === "penyewa") {
        return NextResponse.redirect(new URL("/penyewa/sewa-baru", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/penyewa/:path*", "/login", "/register"],
};
