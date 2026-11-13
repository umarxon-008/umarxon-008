/**
 * O'zbekcha vaqt ifodalarini aniq sanaga aylantirish (prompt §15): "ertaga ertalab", "soat yettida",
 * "kechqurun", "2 soatdan keyin", "juma kuni soat 18:30", "15-dekabr" va h.k.
 * Noaniq qismlar `assumed` ro'yxatida qaytariladi: UI va tasdiq kartasi aniq sanani ko'rsatib, foydalanuvchidan tasdiqlatadi.
 * Sof funksiya: `now` tashqaridan beriladi (testlash va vaqt zonasi uchun).
 */

export interface ParsedTime {
  date: Date;
  /** Taxmin qilingan qismlar (foydalanuvchiga ko'rsatiladi) */
  assumed: string[];
}

const NUMBERS: [RegExp, number][] = [
  [/o['‘’ʻ]?n\s*ikki/, 12],
  [/o['‘’ʻ]?n\s*bir/, 11],
  [/o['‘’ʻ]?ttiz/, 30],
  [/yigirma/, 20],
  [/qirq/, 40],
  [/ellik/, 50],
  [/oltmish/, 60],
  [/to['‘’ʻ]?qqiz/, 9],
  [/sakkiz/, 8],
  [/yetti/, 7],
  [/olti/, 6],
  [/besh/, 5],
  [/to['‘’ʻ]?rt/, 4],
  [/uch/, 3],
  [/ikki/, 2],
  [/bir/, 1],
  [/o['‘’ʻ]?n/, 10],
];

/** "o'n ikki" → 12, "yigirma besh" → 25, "7" → 7 */
export function wordToNumber(word: string): number | null {
  const w = word.toLowerCase().trim();
  if (/^\d+$/.test(w)) return Number(w);
  let rest = w;
  let total = 0;
  let found = false;
  for (const [re, n] of NUMBERS) {
    const m = re.exec(rest);
    if (m && m.index === 0) {
      total += n;
      found = true;
      rest = rest.slice(m[0].length).trim();
      // "yigirma besh" / "o'n bir": keyingi so'z ham qo'shiladi
      for (const [re2, n2] of NUMBERS) {
        const m2 = re2.exec(rest);
        if (m2 && m2.index === 0 && n2 < 10) {
          total += n2;
          rest = rest.slice(m2[0].length).trim();
          break;
        }
      }
      break;
    }
  }
  return found && rest.replace(/(da|ga|dan|ta)$/, '') === '' ? total : found ? total : null;
}

const NUM_WORD =
  "(?:\\d{1,2}|o['‘’ʻ]?n\\s*(?:bir|ikki)|o['‘’ʻ]?n|bir|ikki|uch|to['‘’ʻ]?rt|besh|olti|yetti|sakkiz|to['‘’ʻ]?qqiz|yigirma(?:\\s*\\w+)?|o['‘’ʻ]?ttiz|qirq|ellik|oltmish)";

const MONTHS: Record<string, number> = {
  yanvar: 0,
  fevral: 1,
  mart: 2,
  aprel: 3,
  may: 4,
  iyun: 5,
  iyul: 6,
  avgust: 7,
  sentabr: 8,
  sentyabr: 8,
  oktabr: 9,
  oktyabr: 9,
  noyabr: 10,
  dekabr: 11,
};
const WEEKDAYS: Record<string, number> = {
  yakshanba: 0,
  dushanba: 1,
  seshanba: 2,
  chorshanba: 3,
  payshanba: 4,
  juma: 5,
  shanba: 6,
};

type DayPart = 'ertalab' | 'tushda' | 'kunduzi' | 'kechqurun' | 'kechasi';
const DAY_PART_DEFAULT: Record<DayPart, number> = {
  ertalab: 8,
  tushda: 12,
  kunduzi: 14,
  kechqurun: 19,
  kechasi: 22,
};

function detectDayPart(t: string): DayPart | null {
  if (/ertalab|tong(da)?\b|ertalabki/.test(t)) return 'ertalab';
  if (/tushdan\s*keyin|kunduzi|peshin/.test(t)) return 'kunduzi';
  if (/tushda\b|tush\s*payti/.test(t)) return 'tushda';
  if (/kechqurun|kechki|oqshom/.test(t)) return 'kechqurun';
  if (/kechasi|tunda|yarim\s*tun/.test(t)) return 'kechasi';
  return null;
}

function applyDayPart(hour: number, part: DayPart | null): number {
  if (!part) return hour;
  if ((part === 'kunduzi' || part === 'kechqurun') && hour < 12) return hour + 12;
  if (part === 'kechasi' && hour >= 6 && hour < 12) return hour + 12;
  if (part === 'tushda' && hour < 6) return hour + 12;
  return hour;
}

export function parseUzbekDateTime(input: string, now: Date): ParsedTime | null {
  const t = ` ${input
    .toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, ' ')} `;
  const assumed: string[] = [];

  // 1) Nisbiy: "30 daqiqadan keyin", "2 soatdan keyin", "yarim soatdan keyin", "3 kundan keyin"
  const rel = new RegExp(
    `(${NUM_WORD}|yarim)\\s*(daqiqa|minut|soat|kun)\\s*(?:dan|-?dan)?\\s*(?:keyin|so'ng)`,
  ).exec(t);
  if (rel) {
    const amount = rel[1] === 'yarim' ? 0.5 : wordToNumber(rel[1]!);
    if (amount !== null) {
      const ms =
        rel[2] === 'kun' ? amount * 86_400_000 : rel[2] === 'soat' ? amount * 3_600_000 : amount * 60_000;
      if (rel[2] !== 'kun') return { date: new Date(now.getTime() + ms), assumed };
      // "3 kundan keyin" — kun belgilanadi, soat pastda aniqlanadi
    }
  }

  // 2) Kun
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let dayGiven = false;
  if (rel && rel[2] === 'kun') {
    const n = rel[1] === 'yarim' ? 0 : (wordToNumber(rel[1]!) ?? 0);
    day.setDate(day.getDate() + n);
    dayGiven = true;
  } else if (/\bindin(ga)?\b|\bertasiga\b/.test(t)) {
    day.setDate(day.getDate() + 2);
    dayGiven = true;
  } else if (/\bertaga\b|\bertangi\b/.test(t)) {
    day.setDate(day.getDate() + 1);
    dayGiven = true;
  } else if (/\bbugun\b/.test(t)) {
    dayGiven = true;
  }

  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(t);
  const dotted = /\b(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?\b(?!\s*(?:da|ga)?\s*(?:soat|:))/.exec(t);
  const named =
    /\b(\d{1,2})[- ]?(?:chi\s*|inchi\s*|-)?\s*(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|sentyabr|oktabr|oktyabr|noyabr|dekabr)/.exec(
      t,
    );
  if (iso) {
    day.setFullYear(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    dayGiven = true;
  } else if (named) {
    day.setMonth(MONTHS[named[2]!]!, Number(named[1]));
    if (day < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      day.setFullYear(day.getFullYear() + 1);
    dayGiven = true;
  } else if (dotted && !/soat/.test(t.slice(Math.max(0, dotted.index - 6), dotted.index))) {
    const [d, m, y] = [Number(dotted[1]), Number(dotted[2]), dotted[3] ? Number(dotted[3]) : null];
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      day.setFullYear(y ?? day.getFullYear(), m - 1, d);
      if (!y && day < new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        day.setFullYear(day.getFullYear() + 1);
      dayGiven = true;
    }
  } else {
    const wd = Object.keys(WEEKDAYS).find((w) => new RegExp(`\\b${w}\\b`).test(t));
    if (wd) {
      const target = WEEKDAYS[wd]!;
      let diff = (target - now.getDay() + 7) % 7;
      if (/kelasi\s*hafta|keyingi\s*hafta/.test(t) && diff === 0) diff = 7;
      day.setDate(day.getDate() + diff);
      dayGiven = true;
    }
  }

  // 3) Soat
  const part = detectDayPart(t);
  let hour: number | null = null;
  let minute = 0;
  const clock = /(?:soat\s*)?\b(\d{1,2})[:.](\d{2})\b/.exec(t);
  const spoken =
    new RegExp(`soat\\s*(${NUM_WORD})(?:\\s*(yarim))?(?:da|ga)?\\b`).exec(t) ??
    new RegExp(`\\b(\\d{1,2})\\s*(?:(yarim)\\s*)?(?:da|ga)\\b`).exec(t);
  if (
    clock &&
    Number(clock[1]) <= 23 &&
    Number(clock[2]) <= 59 &&
    !(dotted && clock.index === dotted.index && !/soat|:/.test(clock[0]))
  ) {
    hour = Number(clock[1]);
    minute = Number(clock[2]);
  } else if (spoken) {
    const h = wordToNumber(spoken[1]!.replace(/(da|ga)$/, ''));
    if (h !== null && h <= 23) {
      hour = h;
      if (spoken[2]) minute = 30;
    }
  }

  if (hour === null) {
    if (part) {
      hour = DAY_PART_DEFAULT[part];
      assumed.push(`soat ${String(hour).padStart(2, '0')}:00 (${part})`);
    } else if (dayGiven) {
      hour = 9;
      assumed.push('soat 09:00 (vaqt aytilmagan)');
    } else {
      return null;
    }
  } else if (part) {
    hour = applyDayPart(hour, part);
  } else if (hour >= 1 && hour <= 11 && !clock?.[0].includes(':')) {
    // "soat 7" — ertalabmi, kechqurunmi? Eng yaqin kelajakdagisi tanlanadi va taxmin deb belgilanadi
    const am = new Date(day);
    am.setHours(hour, minute, 0, 0);
    const pm = new Date(day);
    pm.setHours(hour + 12, minute, 0, 0);
    if (!dayGiven || am.getTime() <= now.getTime()) {
      if (am.getTime() <= now.getTime() && pm.getTime() > now.getTime()) hour += 12;
    }
    assumed.push(hour >= 12 ? 'kechki vaqt' : 'ertalabki vaqt');
  }

  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  if (!dayGiven && date.getTime() <= now.getTime()) {
    date.setDate(date.getDate() + 1);
    assumed.push('ertaga (bugungi vaqt o‘tib ketgan)');
  }
  return { date, assumed };
}

const WEEKDAY_NAMES = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const MONTH_NAMES = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

/** "Bugun, 19:00" / "Ertaga, 08:00" / "15-dekabr, juma, 18:30" */
export function formatUzDateTime(date: Date, now: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days === 0) return `Bugun, ${time}`;
  if (days === 1) return `Ertaga, ${time}`;
  if (days === -1) return `Kecha, ${time}`;
  const year = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}-yil` : '';
  return `${date.getDate()}-${MONTH_NAMES[date.getMonth()]}${year}, ${WEEKDAY_NAMES[date.getDay()]}, ${time}`;
}
