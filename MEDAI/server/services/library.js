/** data/medical-terms.json dan atamalarni o'qiydi va qidiruv imkonini beradi. */
// JSON to'g'ridan-to'g'ri import qilinadi — Netlify Functions to'plamiga (bundle) ham kiradi.
import raw from '../../data/medical-terms.json' with { type: 'json' };
import { normalize } from './text.js';

export const libraryMeta = raw.meta;
export const terms = raw.terms.map((t) => ({
  ...t,
  _aliases: [...new Set([t.term, ...t.aliases].map(normalize))].sort((a, b) => b.length - a.length),
}));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Alias so'z chegarasida uchrayaptimi.
 * Chap tomonda doim so'z chegarasi talab qilinadi. Qisqa aliaslar (<=4 belgi) to'liq so'z bo'lishi shart
 * ("qand" != "qanday", "hb" != "hba1c"); uzunlariga o'zbekcha qo'shimchalar ruxsat ("gemoglobinim").
 */
function aliasInText(alias, text) {
  const right = alias.length <= 4 ? '($|[^\\p{L}\\p{N}])' : '';
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(alias)}${right}`, 'u').test(text);
}

/** Matnda tilga olingan atamalarni qaytaradi. */
export function findTermsInText(input) {
  const text = normalize(input);
  return terms.filter((t) => t._aliases.some((a) => aliasInText(a, text)));
}

/** Laboratoriya ko'rsatkichi nomiga mos atamani topadi. */
export function findTermForAnalyte(name) {
  const text = normalize(name);
  if (!text) return null;
  return terms.find((t) => t._aliases.some((a) => text === a || aliasInText(a, text))) || null;
}

export function publicTerm(t) {
  if (!t) return null;
  const { _aliases, ...rest } = t;
  return rest;
}
