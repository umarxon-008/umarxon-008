import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/secret";

// NeuraMed — Edge middleware: himoyalangan sahifa va API'lar uchun sessiya tekshiruvi.
// To'liq tekshiruv (DB sessiya) route ichida `requireAuth()` orqali bajariladi.

const COOKIE_NAME = "neuramed_session";

const PUBLIC_API = ["/api/auth", "/api/notifications/cron", "/api/health"];
const PUBLIC_PAGES = ["/login", "/register", "/onboarding", "/c/"];

async function isValid(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!(await isValid(token))) {
      return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  if (!(await isValid(token))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|brand/|apple-touch-icon.png|manifest.json|sw.js|sw-custom.js|workbox-.*|offline.html).*)",
  ],
};
