import {
  Home, Pill, FlaskConical, ScanSearch, CalendarDays, User, Settings,
  IdCard, HeartPulse, Stethoscope, LayoutGrid,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem { href: string; icon: React.ElementType; label: string }
export interface NavGroup { title: string | null; items: NavItem[] }

const ACCOUNT: NavGroup = {
  title: "Hisob",
  items: [
    { href: "/profile", icon: User, label: "Profil" },
    { href: "/settings", icon: Settings, label: "Sozlamalar" },
  ],
};

/** Bemor menyusi. */
export const PATIENT_NAV: NavGroup[] = [
  { title: null, items: [{ href: "/dashboard", icon: Home, label: "Bosh sahifa" }] },
  {
    title: "Salomatligim",
    items: [
      { href: "/medcard", icon: IdCard, label: "Tibbiy karta (QR)" },
      { href: "/checkup", icon: HeartPulse, label: "Chekap" },
    ],
  },
  {
    title: "Shaxsiy yordamchi",
    items: [
      { href: "/medications", icon: Pill, label: "Dorilar" },
      { href: "/lab-reports", icon: FlaskConical, label: "Tahlillar" },
    ],
  },
  {
    title: null,
    items: [
      { href: "/trace", icon: ScanSearch, label: "PHARMA TRACE" },
      { href: "/connect", icon: CalendarDays, label: "MEDCONNECT" },
    ],
  },
  ACCOUNT,
];

/** Shifokor menyusi. */
export const DOCTOR_NAV: NavGroup[] = [
  { title: null, items: [{ href: "/doctor", icon: Stethoscope, label: "Shifokor paneli" }] },
  { title: null, items: [{ href: "/trace", icon: ScanSearch, label: "PHARMA TRACE" }] },
  ACCOUNT,
];

export const navFor = (role: UserRole) => (role === "doctor" ? DOCTOR_NAV : PATIENT_NAV);

/** Telefondagi pastki menyu. */
export const bottomFor = (role: UserRole): NavItem[] =>
  role === "doctor"
    ? [
        { href: "/doctor", icon: Stethoscope, label: "Panel" },
        { href: "/trace", icon: ScanSearch, label: "PHARMA TRACE" },
        { href: "/more", icon: LayoutGrid, label: "Menyu" },
      ]
    : [
        { href: "/dashboard", icon: Home, label: "Bosh sahifa" },
        { href: "/medications", icon: Pill, label: "Dorilar" },
        { href: "/checkup", icon: HeartPulse, label: "Chekap" },
        { href: "/connect", icon: CalendarDays, label: "Shifokor" },
        { href: "/more", icon: LayoutGrid, label: "Menyu" },
      ];

export const isActivePath = (pathname: string, href: string) =>
  pathname === href || (href !== "/dashboard" && href !== "/doctor" && pathname.startsWith(href.split("/").slice(0, 2).join("/"))) || (href === "/doctor" && pathname.startsWith("/doctor/"));
