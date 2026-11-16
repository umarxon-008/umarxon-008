// MEDPERFECT moduli (NeuraMed ga birlashtirilgan). Asl manba: MEDPERFECT/shared/
/**
 * Kutubxona atamalari bilan ishlash (server va brauzer uchun umumiy, toza ESM).
 * Ma'lumot tashqaridan beriladi: prepareLibrary(data/medical-terms.json mazmuni).
 */
import { normalize } from './text.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function prepareLibrary(raw) {
  return {
    meta: raw.meta,
    terms: raw.terms.map((t) => ({
      ...t,
      _aliases: [...new Set([t.term, ...t.aliases].map(normalize))].sort((a, b) => b.length - a.length),
    })),
  };
}

/**
 * Alias so'z chegarasida uchrayaptimi.
 * Chap tomonda doim so'z chegarasi talab qilinadi. Qisqa aliaslar (<=4 belgi) to'liq so'z bo'lishi shart
 * ("qand" != "qanday", "hb" != "hba1c"); uzunlariga o'zbekcha qo'shimchalar ruxsat ("gemoglobinim").
 */
export function aliasInText(alias, text) {
  const right = alias.length <= 4 ? '($|[^\\p{L}\\p{N}])' : '';
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(alias)}${right}`, 'u').test(text);
}

/** Matnda tilga olingan atamalar (matnda uchragan tartibda). */
export function findTermsInText(lib, input) {
  const text = normalize(input);
  const hits = [];
  for (const t of lib.terms) {
    let pos = Infinity;
    for (const a of t._aliases) {
      if (!aliasInText(a, text)) continue;
      const i = text.indexOf(a);
      if (i >= 0 && i < pos) pos = i;
    }
    if (pos !== Infinity) hits.push({ t, pos });
  }
  return hits.sort((a, b) => a.pos - b.pos).map((h) => h.t);
}

/** Laboratoriya ko'rsatkichi nomiga mos atama. */
export function findTermForAnalyte(lib, name) {
  const text = normalize(name);
  if (!text) return null;
  return lib.terms.find((t) => t._aliases.some((a) => text === a || aliasInText(a, text))) || null;
}

export function publicTerm(t) {
  if (!t) return null;
  const { _aliases, ...rest } = t;
  return rest;
}
