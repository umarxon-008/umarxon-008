/**
 * MEDPERFECT modullari uchun umumiy yordamchilar: saqlash, sanalar, formatlash, sahifa sarlavhasi.
 * Saqlash mavjud mexanizm — brauzer localStorage (faqat shu qurilmada). Kalitlar "medperfect." bilan boshlanadi.
 */
import { el, icon } from '../utils.js';

const PREFIX = 'medperfect.';

export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

export function saveState(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* saqlash imkoni yo'q */ }
}

export function clearAllPlatformState() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

/** Bugundan n kun keyingi (yoki oldingi) sana. */
export function dayOffset(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysUntil(date) {
  const a = new Date(); a.setHours(12, 0, 0, 0);
  const b = new Date(date); b.setHours(12, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => { const x = new Date(d); return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`; };
export const isoDay = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const fmtNum = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
export const fmtSom = (n) => `${fmtNum(n)} soʻm`;
/** Katta summalar uchun qisqa ko'rinish: 17,6 mln soʻm */
export const fmtSomShort = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mln soʻm` : fmtSom(n));

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const weekday = (d) => WEEKDAYS[new Date(d).getDay()];
export const weekdayShort = (d) => WEEKDAYS_SHORT[new Date(d).getDay()];
export const fmtLongDate = (d) => { const x = new Date(d); return `${x.getDate()}-${MONTHS[x.getMonth()]}, ${WEEKDAYS[x.getDay()].toLowerCase()}`; };

/** Modul sahifasining yuqori qismi (sarlavha, tavsif, demo belgisi). */
export function moduleHero({ key, iconName, title, subtitle, badge = 'Demo maʼlumotlar' }) {
  return el('div', { class: `module-hero module-hero--${key}` }, [
    el('span', { class: 'module-hero__icon' }, [icon(iconName)]),
    el('div', { class: 'module-hero__text' }, [
      el('div', { class: 'module-hero__title-row' }, [
        el('h2', { class: 'module-hero__title', text: title }),
        el('span', { class: 'mode-badge mode-badge--demo' }, [icon('flask-conical'), badge]),
      ]),
      el('p', { class: 'module-hero__subtitle', text: subtitle }),
    ]),
  ]);
}

export function demoNotice(text) {
  return el('div', { class: 'notice notice--warning' }, [icon('badge-info'), el('p', { text })]);
}

export function kpi({ label, value, hint, tone = 'teal', iconName }) {
  return el('div', { class: `kpi kpi--${tone}` }, [
    el('span', { class: 'kpi__icon' }, [icon(iconName)]),
    el('div', { class: 'kpi__body' }, [
      el('span', { class: 'kpi__label', text: label }),
      el('strong', { class: 'kpi__value', text: String(value) }),
      hint ? el('span', { class: 'kpi__hint', text: hint }) : null,
    ]),
  ]);
}

/** Oddiy tablar: [{id, label, iconName, count}] — tanlanganida onChange(id). */
export function tabs(items, active, onChange) {
  const bar = el('div', { class: 'tabs tabs--module', role: 'tablist' });
  for (const t of items) {
    const on = t.id === active;
    const btn = el('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(on), tabindex: on ? '0' : '-1', dataset: { tab: t.id } }, [
      t.iconName ? icon(t.iconName) : null,
      t.label,
      t.count ? el('span', { class: 'tab__count', text: String(t.count) }) : null,
    ]);
    btn.addEventListener('click', () => onChange(t.id));
    bar.append(btn);
  }
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = [...bar.querySelectorAll('[role="tab"]')];
    const i = list.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    onChange(next.dataset.tab);
    requestAnimationFrame(() => bar.parentElement?.querySelector(`[data-tab="${next.dataset.tab}"]`)?.focus());
  });
  return bar;
}

export const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
