/** Modullar uchun sana yordamchilari (namunaviy sanalar bugungi kunga nisbatan hisoblanadi). */
export function dayOffset(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
export function daysUntil(date: string | Date): number {
  const a = new Date(); a.setHours(12, 0, 0, 0);
  const b = new Date(date); b.setHours(12, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date | string) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
