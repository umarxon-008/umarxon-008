import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS: Record<string, { long: string[]; short: string[] }> = {
  uz: {
    long: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
    short: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  },
  ru: {
    long: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    short: ["янв.", "фев.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сен.", "окт.", "нояб.", "дек."],
  },
  kk: {
    long: ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"],
    short: ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."],
  },
  ky: {
    long: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
    short: ["янв.", "фев.", "мар.", "апр.", "май", "июн.", "июл.", "авг.", "сен.", "окт.", "ноя.", "дек."],
  },
  tg: {
    long: ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"],
    short: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  },
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

/**
 * Sanani tanlangan tilda formatlaydi. Brauzerlarda lokal ma'lumotlari turlicha bo'lgani uchun
 * Intl ishlatilmaydi — server va brauzer bir xil matn chiqaradi (hydration xatosi bo'lmaydi).
 */
export function uzDate(date: Date | string, opts: { short?: boolean; year?: boolean; locale?: string } = {}): string {
  let y: number, m: number, d: number;
  const ymd = typeof date === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (ymd) { y = +ymd[1]; m = +ymd[2] - 1; d = +ymd[3]; }
  else { const x = new Date(date); y = x.getUTCFullYear(); m = x.getUTCMonth(); d = x.getUTCDate(); }
  if (Number.isNaN(y)) return "—";
  const lang = opts.locale && MONTHS[opts.locale] ? opts.locale : "uz";
  const month = MONTHS[lang][opts.short ? "short" : "long"][m];
  const withYear = opts.year !== false;
  if (lang === "en") return withYear ? `${month} ${d}, ${y}` : `${month} ${d}`;
  if (lang === "ru" || lang === "kk" || lang === "tg") return withYear ? `${d} ${month} ${y}` : `${d} ${month}`;
  if (lang === "ky") return withYear ? `${y}-ж. ${d}-${month}` : `${d}-${month}`;
  return withYear ? `${d}-${month}, ${y}` : `${d}-${month}`;
}

export function formatDate(date: Date | string, locale = "uz"): string {
  return uzDate(date, { locale: locale.slice(0, 2) });
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
