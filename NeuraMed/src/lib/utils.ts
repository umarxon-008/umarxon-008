import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale = "uz-UZ"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  // "08:00" => "08:00"
  return time;
}

export function getTimeLabel(time: string): string {
  const [hourStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  if (hour >= 5 && hour < 12) return "Ertalab";
  if (hour >= 12 && hour < 17) return "Kunduz";
  if (hour >= 17 && hour < 21) return "Kechqurun";
  return "Kechasi";
}

export function foodRuleLabel(rule: string): string {
  if (rule === "ovqat_bilan") return "Ovqat bilan";
  if (rule === "bosh_qorin") return "Bo'sh qorin";
  return "Ovqat bilan yoki bo'sh qorinda";
}

export function statusColor(status: "low" | "normal" | "high" | "unknown") {
  switch (status) {
    case "low":
      return "text-blue-600 bg-blue-50";
    case "high":
      return "text-red-600 bg-red-50";
    case "normal":
      return "text-green-600 bg-green-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export function statusLabel(status: "low" | "normal" | "high" | "unknown") {
  switch (status) {
    case "low":
      return "Past";
    case "high":
      return "Yuqori";
    case "normal":
      return "Normal";
    default:
      return "Noma'lum";
  }
}

export function urgencyColor(level: string) {
  switch (level) {
    case "emergency":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    default:
      return "bg-green-600 text-white";
  }
}

export function truncate(str: string, length = 100): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return "{}";
  }
}

export const DISCLAIMER_UZ =
  "⚠️ Bu umumiy ma'lumot bo'lib, tashxis yoki davolash bo'yicha shifokor maslahati emas. Har qanday tibbiy qaror qabul qilishdan oldin shifokorga murojaat qiling.";
