// UI uchun formatlash (o'zbek lotin). Raqamlar: 12 345,6
// Intl lokal ma'lumotlari Node va brauzerda farq qilishi mumkin (gidratatsiya xatosi), shuning uchun
// raqam formatlash deterministik, qo'lda bajariladi.
function groupThousands(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(digits);
  const [int, frac] = fixed.split('.');
  const trimmed = frac ? frac.replace(/0+$/, '') : '';
  const sign = value < 0 && Number(fixed) !== 0 ? '−' : '';
  return `${sign}${groupThousands(int!)}${trimmed ? ',' + trimmed : ''}`;
}

export function formatKw(value: number | null | undefined): string {
  return `${formatNumber(value, value !== null && value !== undefined && Math.abs(value) < 10 ? 2 : 1)} kW`;
}

export function formatKwh(value: number | null | undefined): string {
  return `${formatNumber(value, value !== null && value !== undefined && Math.abs(value) < 10 ? 2 : 1)} kWh`;
}

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const digits = currency === 'UZS' ? 0 : 2;
  return `${formatNumber(value, digits)} ${currency === 'UZS' ? "so'm" : currency}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 1)}%`;
}

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

function parts(date: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const m: Record<string, string> = {};
  for (const x of p) m[x.type] = x.value;
  return { y: m.year!, mo: Number(m.month) - 1, d: String(Number(m.day)), h: m.hour!, mi: m.minute! };
}

export function formatDateTime(date: Date | string | null | undefined, timeZone: string): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const p = parts(d, timeZone);
  return `${p.d}-${MONTHS[p.mo]} ${p.y}, ${p.h}:${p.mi}`;
}

export function formatDate(date: Date | string, timeZone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = parts(d, timeZone);
  return `${p.d}-${MONTHS[p.mo]} ${p.y}`;
}

export function formatTime(date: Date | string, timeZone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = parts(d, timeZone);
  return `${p.h}:${p.mi}`;
}

/** Grafik o'qi uchun qisqa yorliq. */
export function formatBucketLabel(date: Date | string, granularity: string, timeZone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const p = parts(d, timeZone);
  switch (granularity) {
    case 'hour':
      return `${p.d}-${MONTHS[p.mo]} ${p.h}:00`;
    case 'month':
      return `${MONTHS[p.mo]} ${p.y}`;
    default:
      return `${p.d}-${MONTHS[p.mo]}`;
  }
}

export function formatRelative(date: Date | string | null | undefined, now = new Date()): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Math.round((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  return `${Math.floor(diff / 86400)} kun oldin`;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} daqiqa`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

/** AI Inspector dalili: vaqt bo'lsa — mahalliy vaqtda, raqam bo'lsa — o'zbekcha formatda. */
export function formatEvidence(e: { value: number | string; unit?: string; at?: string }, timeZone: string): string {
  if (e.at) return formatDateTime(e.at, timeZone);
  const v = typeof e.value === 'number' ? formatNumber(e.value, 3) : e.value;
  return e.unit ? `${v} ${e.unit}` : String(v);
}
