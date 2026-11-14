import type { WindowEntry } from '@shared/ipc';

/**
 * Ekran rasmidan oldin ogohlantirish (PHASE 8): ochiq oynalar orasida bank, parol menejeri,
 * to'lov yoki kirish sahifasiga o'xshaganlari bo'lsa, tasdiq oynasida aytiladi.
 * Oyna nomlari ishonchsiz matn: faqat ko'rsatish uchun qisqartiriladi.
 */
const SENSITIVE = new RegExp(
  [
    // So'z boshi bo'yicha (Passwords, KeePassXC, Banking)
    String.raw`\b(?:pass(?:word|wort)|parol|keepass|bitwarden|lastpass|1password|authenticator|wallet|hamyon|bank|kapitalbank|payme|uzcard|humo|paynet|apelsin)`,
    // To'liq so'z (pin, card kabi qisqalari boshqa so'zlar ichida uchramasligi uchun)
    String.raw`\b(?:login|sign[\s-]?in|kirish|karta|card|click\.uz|2fa|otp|cvv|pin)\b`,
  ].join('|'),
  'i',
);

export function sensitiveWindowTitles(windows: WindowEntry[], max = 3): string[] {
  const out: string[] = [];
  for (const w of windows) {
    const text = `${w.app} ${w.title}`;
    if (!SENSITIVE.test(text)) continue;
    const t = Array.from(w.title, (c) => (c.charCodeAt(0) < 32 ? ' ' : c))
      .join('')
      .trim();
    out.push(t.length > 60 ? `${t.slice(0, 59)}…` : t);
    if (out.length >= max) break;
  }
  return out;
}
