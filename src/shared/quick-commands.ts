import type { MediaAction } from './ipc';

/**
 * Tezkor buyruqlar: aniq va qisqa o'zbekcha buyruqlar AI'siz, darhol bajariladi
 * ("Telegramni och", "ovozni pasaytir", "batareya"). AI javobini kutish shart emas.
 * Bu yerda faqat matn taniladi; dastur yoki jarayon nomi keyin aniq moslik bilan tekshiriladi,
 * mos kelmasa so'rov odatdagidek AI'ga yuboriladi.
 */
export type QuickIntent =
  | { kind: 'open_app'; name: string }
  | { kind: 'close_app'; name: string }
  | { kind: 'media'; action: MediaAction }
  | { kind: 'battery' }
  | { kind: 'disk' };

const OPEN_VERBS =
  '(?:och|ochgin|ochib ber|ochib qoy|ochvor|ishga tushir|ishga tushirib ber|ishga tushirgin)';
const CLOSE_VERBS = '(?:yop|yopgin|yopib ber|yopib qoy|yopvor|ochir|ochirib qoy|ochirib ber)';

/** Apostroflar olib tashlanadi: "o‘chir" → "ochir", "qo'shiq" → "qoshiq" */
export function normalizeCommand(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, '')
    .replace(/[.!,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:marius|maryus)\s+/, '')
    .replace(/^(?:iltimos|ilimos)\s+/, '')
    .replace(/\s+(?:iltimos|ilimos)$/, '')
    .trim();
}

const MEDIA: [RegExp, MediaAction][] = [
  [
    /^ovoz(?:ni)?\s+(?:pasaytir|kamaytir|pastlat|past qil|ozroq qil|kichraytir)(?:gin|ib ber|ib qoy)?$/,
    'volume_down',
  ],
  [
    /^ovoz(?:ni)?\s+(?:balandlat|oshir|kotar|baland qil|kopaytir|kuchaytir)(?:gin|ib ber|ib qoy)?$/,
    'volume_up',
  ],
  [/^(?:ovoz(?:ni)?\s+(?:ochir|jim qil)(?:gin|ib ber|ib qoy)?|jim)$/, 'mute'],
  [
    /^(?:pauza|pauza qil|play|ijro et|davom ettir|musiqa(?:ni)?\s+(?:toxtat|davom ettir|qoy|yoq))$/,
    'play_pause',
  ],
  [/^(?:keyingi(?:si)?\s+(?:qoshiq|trek|musiqa|video)|keyingisi)(?:ga ot|ni qoy|ni yoq)?$/, 'next_track'],
  [/^oldingi(?:si)?\s+(?:qoshiq|trek|musiqa|video)(?:ga qayt|ni qoy|ni yoq)?$/, 'previous_track'],
];

export function parseQuickCommand(text: string): QuickIntent | null {
  if (text.length > 80) return null;
  const t = normalizeCommand(text);
  if (!t) return null;
  for (const [re, action] of MEDIA) if (re.test(t)) return { kind: 'media', action };

  const words = t.replace(/\?/g, '').split(' ');
  if (words.length <= 5 && /\b(?:batareya|batareyka|zaryad)/.test(t)) return { kind: 'battery' };
  if (words.length <= 6 && /\bdisk/.test(t) && /\b(?:joy|bosh|hajm)/.test(t)) return { kind: 'disk' };
  if (t.includes('?')) return null;

  const open = new RegExp(`^(.{2,40}?)\\s+${OPEN_VERBS}$`).exec(t);
  if (open && open[1]!.split(' ').length <= 4) return { kind: 'open_app', name: open[1]! };
  const close = new RegExp(`^(.{2,40}?)\\s+${CLOSE_VERBS}$`).exec(t);
  if (close && close[1]!.split(' ').length <= 4) return { kind: 'close_app', name: close[1]! };
  return null;
}
