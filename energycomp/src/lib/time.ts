// Vaqt zonasi bilan ishlash. Barcha vaqtlar bazada UTC (timestamptz) saqlanadi,
// ko'rsatish va "bugun" hisoblash tashkilot vaqt zonasida bajariladi.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export type Granularity = 'hour' | 'day' | 'week' | 'month';
export const GRANULARITIES: Granularity[] = ['hour', 'day', 'week', 'month'];

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** UTC va berilgan zona o'rtasidagi farq (ms), shu lahza uchun. */
export function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value);
  const asUtc = Date.UTC(m.year!, m.month! - 1, m.day!, m.hour!, m.minute!, m.second!);
  const whole = date.getTime() - date.getUTCMilliseconds();
  return asUtc - whole;
}

/** Zonadagi "devor soati" qismlari. */
export function zonedParts(date: Date, timeZone: string) {
  const local = new Date(date.getTime() + tzOffsetMs(date, timeZone));
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    weekday: local.getUTCDay(), // 0 = yakshanba
  };
}

/** Zonadagi mahalliy sana/vaqtni UTC lahzaga aylantiradi. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month, day, hour, minute);
  const off1 = tzOffsetMs(new Date(guess), timeZone);
  const t = guess - off1;
  const off2 = tzOffsetMs(new Date(t), timeZone);
  return new Date(off1 === off2 ? t : guess - off2);
}

export function startOfZonedDay(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone);
}

export function addZonedDays(date: Date, days: number, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return zonedTimeToUtc(p.year, p.month, p.day + days, p.hour, p.minute, timeZone);
}

/** YYYY-MM-DD (zonada) */
export function toZonedDateInput(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" (zonadagi kun boshi) -> UTC */
export function parseZonedDateInput(value: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = zonedTimeToUtc(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, timeZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DateRange {
  from: Date;
  to: Date;
}

/** Oldingi teng uzunlikdagi davr — taqqoslash uchun. */
export function previousRange(range: DateRange): DateRange {
  const len = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - len), to: new Date(range.from.getTime()) };
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / HOUR);
}

/** Granularity uchun tavsiya etilgan maksimal davr (kun). */
export const MAX_RANGE_DAYS: Record<Granularity, number> = { hour: 14, day: 186, week: 400, month: 800 };
