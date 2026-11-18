import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/secret";

// NeuraMed — Edge middleware: sessiya va rol (bemor / shifokor) tekshiruvi.
// To'liq tekshiruv (DB sessiya va rol) route ichida requireAuth / requirePatient / requireDoctor orqali bajariladi.

const COOKIE_NAME = "neuramed_session";

const PUBLIC_API = ["/api/auth", "/api/notifications/cron", "/api/health"];
const PUBLIC_PAGES = ["/login", "/register", "/onboarding", "/c/"];

/** Birlashtirilgan yoki olib tashlangan bo'limlar → yangi joyi. */
const MOVED: Record<string, string> = {
  "/vitals": "/checkup?tab=vitals",
  "/interactions": "/medications?tab=interactions",
  "/reminders": "/medications",
  "/medications/search": "/medications?tab=search",
  "/imaging-reports": "/lab-reports?tab=imaging",
  "/doctor-visit": "/connect?tab=prep",
  "/sos": "/dashboard",
  "/stock": "/dashboard",
  "/about": "/",
};

/** Faqat bemor uchun bo'limlar (shifokor o'z paneliga yo'naltiriladi). */
const PATIENT_ONLY = ["/dashboard", "/medcard", "/checkup", "/medications", "/lab-reports", "/imaging-reports", "/reminders", "/connect", "/onboarding"];
/** Faqat shifokor uchun bo'limlar. */
const DOCTOR_ONLY = ["/doctor"];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

async function readToken(token?: string): Promise<{ role: "patient" | "doctor" } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { role: payload.role === "doctor" ? "doctor" : "patient" };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await readToken(req.cookies.get(COOKIE_NAME)?.value);

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (!session) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
    return NextResponse.next();
  }

  if (MOVED[pathname]) {
    const url = req.nextUrl.clone();
    const [p, q] = MOVED[pathname].split("?");
    url.pathname = p;
    url.search = q ? `?${q}` : "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/onboarding" && session?.role === "doctor") {
    const url = req.nextUrl.clone(); url.pathname = "/doctor"; url.search = "";
    return NextResponse.redirect(url);
  }

  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const home = session.role === "doctor" ? "/doctor" : "/dashboard";
  const wrongPlace =
    (session.role === "doctor" && PATIENT_ONLY.some((b) => under(pathname, b))) ||
    (session.role === "patient" && DOCTOR_ONLY.some((b) => under(pathname, b)));
  if (wrongPlace) {
    const url = req.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|brand/|apple-touch-icon.png|manifest.json|sw.js|sw-custom.js|workbox-.*|offline.html).*)",
  ],
};
