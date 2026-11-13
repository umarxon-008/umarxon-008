/**
 * Umumiy yordamchi funksiyalar: DOM yaratish, xavfsiz Markdown, formatlash.
 * XAVFSIZLIK: foydalanuvchi yoki AI matni hech qachon to'g'ridan-to'g'ri innerHTML ga berilmaydi.
 * Markdown avval to'liq escape qilinadi, so'ng faqat ruxsat etilgan teglar qo'shiladi.
 */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Xavfsiz element yaratish. children — Node, string (textContent sifatida) yoki massiv.
 * attrs: class, text, html (faqat ishonchli, escape qilingan HTML uchun!), dataset, on{Event}, boshqa atributlar.
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value; // faqat renderMarkdown() natijasi uchun ishlatiladi
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Lucide ikon elementi (keyin icons() bilan SVG ga aylantiriladi). */
export const icon = (name, cls = '') => el('i', { 'data-lucide': name, class: cls, 'aria-hidden': 'true' });

/** Sahifadagi barcha data-lucide elementlarini SVG ga aylantiradi. */
export function icons(root = document) {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ icons: window.lucide.icons, root, attrs: { 'stroke-width': 1.8 } });
  }
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)"<>]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/** Cheklangan va xavfsiz Markdown -> HTML: sarlavha, paragraf, ro'yxat, iqtibos, kod, jadval, havola. */
export function renderMarkdown(src) {
  const lines = escapeHtml(src).replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let para = [];
  let list = null;
  let quote = [];
  let code = null;
  let table = [];

  const flushPara = () => { if (para.length) { html += `<p>${inlineMd(para.join('<br>'))}</p>`; para = []; } };
  const flushList = () => {
    if (list) { html += `<${list.type}>${list.items.map((i) => `<li>${inlineMd(i)}</li>`).join('')}</${list.type}>`; list = null; }
  };
  const flushQuote = () => { if (quote.length) { html += `<blockquote>${inlineMd(quote.join('<br>'))}</blockquote>`; quote = []; } };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
    const isSep = (r) => r.every((c) => /^:?-{2,}:?$/.test(c));
    if (rows.length >= 2 && isSep(rows[1])) {
      const head = rows[0].map((c) => `<th>${inlineMd(c)}</th>`).join('');
      const body = rows.slice(2).map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join('')}</tr>`).join('');
      html += `<div class="md-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    } else {
      html += `<p>${inlineMd(table.join('<br>'))}</p>`;
    }
    table = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); flushTable(); };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) {
      if (code) { html += `<pre><code>${code.join('\n')}</code></pre>`; code = null; } else { flushAll(); code = []; }
      continue;
    }
    if (code) { code.push(line); continue; }
    if (!t) { flushAll(); continue; }
    if (t.startsWith('|')) { flushPara(); flushList(); flushQuote(); table.push(t); continue; }
    flushTable();
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flushAll(); const lvl = Math.min(m[1].length + 2, 6); html += `<h${lvl}>${inlineMd(m[2])}</h${lvl}>`; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushAll(); html += '<hr>'; continue; }
    if ((m = t.match(/^&gt;\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
      list.items.push(m[1]); continue;
    }
    flushList(); flushQuote();
    para.push(t);
  }
  if (code) html += `<pre><code>${code.join('\n')}</code></pre>`;
  flushAll();
  return html;
}

/** Markdown belgilarini olib tashlab oddiy matn qaytaradi (nusxalash va qisqa ko'rinish uchun). */
export function stripMarkdown(src) {
  return String(src ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function normalize(str) {
  return String(str ?? '')
    .replace(/[ʻʼ‘’`´ʹ]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const pad = (n) => String(n).padStart(2, '0');

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(isoOrDate) {
  const d = new Date(isoOrDate);
  return Number.isNaN(d.getTime()) ? String(isoOrDate ?? '') : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "hozirgina", "5 daqiqa oldin", "kecha, 14:20", "03.11.2026" */
export function formatRelative(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `bugun, ${formatTime(iso)}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `kecha, ${formatTime(iso)}`;
  return formatDate(iso);
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = el('textarea', { class: 'sr-only', readonly: true });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export const prefersReducedMotion = () =>
  document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
