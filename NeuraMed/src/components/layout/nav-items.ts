import {
  Home, Pill, Bell, FlaskConical, Scan, Stethoscope, MessageSquare, BookOpen, ScanSearch, CalendarDays, Boxes, User, Settings, Rocket,
} from "lucide-react";

/** Platformaning barcha bo'limlari — yon menyu va "Menyu" sahifasi uchun yagona ro'yxat. */
export const NAV_GROUPS = [
  { title: null, items: [{ href: "/dashboard", icon: Home, label: "Bosh sahifa" }] },
  {
    title: "Shaxsiy yordamchi",
    items: [
      { href: "/medications/search", icon: Pill, label: "Dorilar" },
      { href: "/reminders", icon: Bell, label: "Dori eslatmalari" },
      { href: "/lab-reports", icon: FlaskConical, label: "Tahlillar" },
      { href: "/imaging-reports", icon: Scan, label: "Rentgen hisobotlari" },
      { href: "/doctor-visit", icon: Stethoscope, label: "Qabulga tayyorlanish" },
    ],
  },
  {
    title: "MEDAI",
    items: [
      { href: "/assistant", icon: MessageSquare, label: "AI yordamchi" },
      { href: "/library", icon: BookOpen, label: "Tibbiy kutubxona" },
    ],
  },
  {
    title: "Modullar",
    items: [
      { href: "/trace", icon: ScanSearch, label: "PHARMA TRACE" },
      { href: "/connect", icon: CalendarDays, label: "MEDCONNECT" },
      { href: "/stock", icon: Boxes, label: "MEDSTOCK AI" },
    ],
  },
  {
    title: "Hisob",
    items: [
      { href: "/profile", icon: User, label: "Profil" },
      { href: "/settings", icon: Settings, label: "Sozlamalar" },
      { href: "/about", icon: Rocket, label: "Loyiha haqida" },
    ],
  },
] as const;

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || (href !== "/dashboard" && pathname.startsWith(href.split("/").slice(0, 2).join("/")));
