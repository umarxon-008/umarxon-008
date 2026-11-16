/**
 * MEDSTOCK AI — dori vositalari zaxirasini nazorat qilish (DEMO).
 * "AI tahlil" bo'limi qoidaga asoslangan: kam qolgan, muddati yaqin va qayta buyurtma tavsiyalari.
 * Bu haqiqiy AI integratsiyasi emas. Zaxira va harakatlar shu qurilmada (localStorage) saqlanadi.
 */
import { $, el, icon, icons, normalize } from '../utils.js';
import { toast, openModal, confirmDialog, emptyState } from '../ui.js';
import { STOCK_ITEMS, LEAD_TIME_DAYS, EXPIRY_WARN_DAYS } from '../data/stock-data.js';
import { moduleHero, demoNotice, kpi, loadState, saveState, dayOffset, daysUntil, fmtDate, isoDay, fmtNum, fmtSom, weekdayShort } from './common.js';

const KEY = 'stock.v1';
let tab = 'stock';
let filter = { q: '', status: 'all' };

/* ---------------- Holat (birinchi ochilishda namunadan yaratiladi) ---------------- */
function seed() {
  const items = STOCK_ITEMS.map((i) => ({ ...i, expiry: isoDay(dayOffset(i.expiresIn)) }));
  // Oxirgi 14 kunlik namunaviy harakatlar (deterministik)
  const movements = [];
  items.forEach((it, idx) => {
    for (let d = 14; d >= 1; d -= 1) {
      const wave = 0.6 + ((idx * 7 + d * 3) % 9) / 10;
      const qty = Math.max(1, Math.round(it.avgDaily * wave));
      movements.push({ id: `m-${it.id}-${d}`, itemId: it.id, type: 'out', qty, note: 'Sotuv (namuna)', at: dayOffset(-d).toISOString() });
    }
    if (idx % 3 === 0) movements.push({ id: `m-${it.id}-in`, itemId: it.id, type: 'in', qty: Math.round(it.min * 1.5), note: 'Distribyutordan kirim (namuna)', at: dayOffset(-(idx % 10) - 3).toISOString() });
  });
  return { items, movements, seededAt: new Date().toISOString() };
}

let state = null;
const getState = () => {
  if (!state) {
    state = loadState(KEY, null);
    if (!state?.items) { state = seed(); saveState(KEY, state); }
  }
  return state;
};
const persist = () => saveState(KEY, state);

/* ---------------- Qoidaga asoslangan tahlil ---------------- */
export function itemStatus(it) {
  const left = daysUntil(it.expiry);
  if (left < 0) return { key: 'expired', label: 'Muddati oʻtgan', tone: 'danger', left };
  if (it.qty < it.min) return { key: 'low', label: 'Kam qolgan', tone: 'warning', left };
  if (left <= EXPIRY_WARN_DAYS) return { key: 'expiring', label: 'Muddati yaqin', tone: 'warning', left };
  return { key: 'ok', label: 'Meʼyorda', tone: 'success', left };
}

export function analyze() {
  const { items } = getState();
  const rows = items.map((it) => {
    const st = itemStatus(it);
    const cover = it.avgDaily > 0 ? it.qty / it.avgDaily : Infinity; // necha kunga yetadi
    return { it, st, cover };
  });
  const declining = rows.filter((r) => r.st.key !== 'expired' && (r.it.qty < r.it.min || r.cover < LEAD_TIME_DAYS + 7)).sort((a, b) => a.cover - b.cover);
  const expiring = rows.filter((r) => r.st.left <= EXPIRY_WARN_DAYS).sort((a, b) => a.st.left - b.st.left);
  const reorder = declining.map((r) => ({ ...r, suggest: Math.max(0, Math.ceil(r.it.avgDaily * 30 + r.it.min - r.it.qty)) })).filter((r) => r.suggest > 0);
  const value = items.reduce((s, it) => s + it.qty * it.price, 0);
  return {
    rows, declining, expiring, reorder, value,
    counts: {
      total: items.length,
      low: rows.filter((r) => r.st.key === 'low').length,
      expiring: rows.filter((r) => r.st.key === 'expiring' || (r.st.left <= EXPIRY_WARN_DAYS && r.st.left >= 0)).length,
      expired: rows.filter((r) => r.st.key === 'expired').length,
      ok: rows.filter((r) => r.st.key === 'ok').length,
    },
  };
}

/* ---------------- Render ---------------- */
export function showStock(param) {
  if (['stock', 'moves', 'insights'].includes(param)) tab = param;
  getState();
  render();
}

function render() {
  const root = $('#view-stock .page');
  const a = analyze();
  const bar = el('div', { class: 'tabs tabs--module', role: 'tablist', 'aria-label': 'MEDSTOCK boʻlimlari' },
    [['stock', 'Zaxira', 'boxes'], ['moves', 'Kirim / chiqim', 'arrow-left-right'], ['insights', 'Tahlil va tavsiyalar', 'brain-circuit', a.reorder.length]]
      .map(([id, label, ic, count]) => {
        const b = el('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(tab === id), dataset: { tab: id } }, [icon(ic), label, count ? el('span', { class: 'tab__count', text: String(count) }) : null]);
        b.addEventListener('click', () => { tab = id; history.replaceState(null, '', `#/stock/${id}`); render(); });
        return b;
      }));

  root.replaceChildren(
    moduleHero({ key: 'stock', iconName: 'boxes', title: 'MEDSTOCK AI', subtitle: 'Dorixona va tibbiyot muassasalarida dori zaxirasini aqlli nazorat qilish', badge: 'Demo ombor' }),
    demoNotice('Namunaviy dorixona zaxirasi. «Tahlil va tavsiyalar» oddiy qoidalar asosida hisoblanadi (sarf tezligi, minimal zaxira, muddat) — bu haqiqiy AI integratsiyasi emas. Oʻzgarishlar faqat shu qurilmada saqlanadi.'),
    el('div', { class: 'kpi-row kpi-row--5' }, [
      kpi({ label: 'Jami pozitsiyalar', value: a.counts.total, iconName: 'boxes', tone: 'teal' }),
      kpi({ label: 'Kam qolgan', value: a.counts.low, iconName: 'trending-down', tone: 'warning', hint: 'minimal zaxiradan past' }),
      kpi({ label: 'Muddati yaqin', value: a.counts.expiring, iconName: 'calendar-clock', tone: 'purple', hint: `${EXPIRY_WARN_DAYS} kundan kam` }),
      kpi({ label: 'Muddati oʻtgan', value: a.counts.expired, iconName: 'circle-x', tone: 'danger' }),
      kpi({ label: 'Zaxira qiymati', value: a.value >= 1e6 ? `${(a.value / 1e6).toFixed(1).replace('.', ',')} mln` : fmtNum(a.value), iconName: 'wallet', tone: 'success', hint: 'soʻm, namunaviy narxlarda' }),
    ]),
    bar,
    { stock: stockTab, moves: movesTab, insights: insightsTab }[tab](a),
  );
  icons(root);
}

function qtyBar(it) {
  const max = Math.max(it.min * 2.5, it.qty, 1);
  const fill = el('span', { class: `qty-bar__fill${it.qty < it.min ? ' qty-bar__fill--low' : ''}` });
  fill.style.width = `${Math.min(100, (it.qty / max) * 100)}%`;
  const mark = el('span', { class: 'qty-bar__min', title: `Minimal: ${it.min}` });
  mark.style.left = `${(it.min / max) * 100}%`;
  return el('span', { class: 'qty-bar', 'aria-hidden': 'true' }, [fill, mark]);
}

function stockTab(a) {
  const q = normalize(filter.q);
  const rows = a.rows.filter((r) => (filter.status === 'all'
    || (filter.status === 'low' && r.st.key === 'low')
    || (filter.status === 'expiring' && r.st.left >= 0 && r.st.left <= EXPIRY_WARN_DAYS)
    || (filter.status === 'expired' && r.st.key === 'expired'))
    && (!q || normalize(`${r.it.name} ${r.it.category} ${r.it.batch}`).includes(q)));

  const input = el('input', { type: 'search', class: 'input', id: 'stockSearch', value: filter.q, placeholder: 'Dori, toifa yoki partiya…', 'aria-label': 'Zaxiradan qidirish' });
  input.addEventListener('input', () => { filter.q = input.value; const pos = input.selectionStart; render(); const n = $('#stockSearch'); n.focus(); n.setSelectionRange(pos, pos); });
  const chips = el('div', { class: 'chip-row' }, [['all', 'Hammasi'], ['low', `Kam qolgan (${a.counts.low})`], ['expiring', `Muddati yaqin (${a.counts.expiring})`], ['expired', `Muddati oʻtgan (${a.counts.expired})`]]
    .map(([id, label]) => el('button', { type: 'button', class: `chip${filter.status === id ? ' is-active' : ''}`, 'aria-pressed': String(filter.status === id), dataset: { status: id } }, [label])));
  chips.addEventListener('click', (e) => { const c = e.target.closest('[data-status]'); if (c) { filter.status = c.dataset.status; render(); } });

  const addBtn = el('button', { type: 'button', class: 'btn btn--primary' }, [icon('package-plus'), 'Kirim / chiqim']);
  addBtn.addEventListener('click', () => openMovement());
  const resetBtn = el('button', { type: 'button', class: 'btn btn--ghost' }, [icon('refresh-cw'), 'Demo maʼlumotni tiklash']);
  resetBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Demo maʼlumotni tiklash', message: 'Zaxira va harakatlar boshlangʻich namunaviy holatga qaytariladi.', confirmLabel: 'Tiklash' });
    if (!ok) return;
    state = seed(); persist(); toast('Demo zaxira tiklandi.', 'success'); render();
  });

  const table = rows.length ? el('div', { class: 'table-wrap' }, [el('table', { class: 'data-table stock-table' }, [
    el('thead', {}, [el('tr', {}, ['Dori vositasi', 'Toifa', 'Miqdor', 'Min.', 'Yaroqlilik', 'Joy', 'Holat', ''].map((h) => el('th', { scope: 'col', text: h })))]),
    el('tbody', {}, rows.map(({ it, st }) => el('tr', { class: `stock-row stock-row--${st.key}` }, [
      el('td', { 'data-label': 'Dori' }, [el('strong', { text: it.name }), el('small', { class: 'mono muted', text: it.batch })]),
      el('td', { 'data-label': 'Toifa', text: it.category }),
      el('td', { 'data-label': 'Miqdor' }, [el('span', { class: 'qty-cell' }, [el('strong', { text: `${fmtNum(it.qty)} ${it.unit}` }), qtyBar(it)])]),
      el('td', { 'data-label': 'Min.', class: 'mono', text: String(it.min) }),
      el('td', { 'data-label': 'Yaroqlilik' }, [el('span', { text: fmtDate(it.expiry) }), el('small', { class: st.left <= EXPIRY_WARN_DAYS ? 'text-warn' : 'muted', text: st.left < 0 ? `${-st.left} kun oldin tugagan` : `${st.left} kun` })]),
      el('td', { 'data-label': 'Joy', class: 'mono', text: it.shelf }),
      el('td', { 'data-label': 'Holat' }, [el('span', { class: `status-badge status-badge--${st.tone}`, text: st.label })]),
      el('td', { class: 'cell-actions' }, [el('button', { type: 'button', class: 'icon-btn icon-btn--sm', dataset: { move: it.id, tooltip: 'Kirim / chiqim' }, 'aria-label': `${it.name}: kirim yoki chiqim` }, [icon('arrow-left-right')])]),
    ]))),
  ])]) : el('div', { class: 'card' }, [emptyState({ iconName: 'search-x', title: 'Hech narsa topilmadi', text: 'Qidiruv yoki filtrni oʻzgartiring.' })]);
  table.addEventListener('click', (e) => { const b = e.target.closest('[data-move]'); if (b) openMovement(b.dataset.move); });

  return el('div', { class: 'stage' }, [
    el('div', { class: 'toolbar' }, [el('div', { class: 'search-box search-box--sm' }, [icon('search'), input]), el('span', { class: 'spacer' }), resetBtn, addBtn]),
    chips,
    el('section', { class: 'card card--flush' }, [table]),
  ]);
}

function movesTab() {
  const { movements, items } = getState();
  const list = [...movements].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const addBtn = el('button', { type: 'button', class: 'btn btn--primary' }, [icon('package-plus'), 'Yangi harakat']);
  addBtn.addEventListener('click', () => openMovement());
  return el('div', { class: 'stage' }, [
    el('div', { class: 'grid-2' }, [
      el('section', { class: 'card' }, [el('h3', { class: 'section-title' }, [icon('chart-column'), 'Oxirgi 14 kun: kunlik chiqim']), outflowChart()]),
      el('section', { class: 'card' }, [el('h3', { class: 'section-title' }, [icon('chart-pie'), 'Zaxira holati boʻyicha']), statusDonut()]),
    ]),
    el('section', { class: 'card card--flush' }, [
      el('div', { class: 'card__head card__head--pad' }, [el('h3', { class: 'section-title' }, [icon('history'), 'Kirim va chiqim tarixi']), addBtn]),
      el('div', { class: 'table-wrap' }, [el('table', { class: 'data-table' }, [
        el('thead', {}, [el('tr', {}, ['Sana', 'Dori vositasi', 'Turi', 'Miqdor', 'Izoh'].map((h) => el('th', { scope: 'col', text: h })))]),
        el('tbody', {}, list.map((m) => el('tr', {}, [
          el('td', { class: 'mono', text: fmtDate(m.at) }),
          el('td', { text: byId[m.itemId]?.name || '—' }),
          el('td', {}, [el('span', { class: `status-badge status-badge--${m.type === 'in' ? 'success' : 'muted'}` }, [icon(m.type === 'in' ? 'arrow-down-to-line' : 'arrow-up-from-line'), m.type === 'in' ? 'Kirim' : 'Chiqim'])]),
          el('td', { class: 'mono', text: `${m.type === 'in' ? '+' : '−'}${fmtNum(m.qty)}` }),
          el('td', { class: 'muted', text: m.note || '' }),
        ]))),
      ])]),
    ]),
  ]);
}

function insightsTab(a) {
  const li = (title, sub, tone, action) => el('li', { class: `insight insight--${tone}` }, [el('div', {}, [el('strong', { text: title }), el('span', { text: sub })]), action || null]);
  const orderBtn = (r) => {
    const b = el('button', { type: 'button', class: 'btn btn--secondary btn--sm' }, [icon('package-plus'), `+${r.suggest}`]);
    b.addEventListener('click', () => openMovement(r.it.id, 'in', r.suggest));
    return b;
  };
  const summary = `Namunaviy omborda ${a.counts.total} ta pozitsiyadan ${a.declining.length} tasi tez kamaymoqda, ${a.expiring.length} tasining muddati ${EXPIRY_WARN_DAYS} kundan kam qolgan yoki oʻtgan. ${a.reorder.length} ta mahsulotni qayta buyurtma qilish tavsiya etiladi.`;
  return el('div', { class: 'stage' }, [
    el('section', { class: 'card insight-hero' }, [
      el('span', { class: 'insight-hero__icon' }, [icon('brain-circuit')]),
      el('div', {}, [
        el('div', { class: 'module-hero__title-row' }, [el('h3', { text: 'Aqlli tahlil' }), el('span', { class: 'mode-badge mode-badge--demo' }, [icon('flask-conical'), 'Qoidaga asoslangan · AI emas'])]),
        el('p', { text: summary }),
        el('p', { class: 'muted small', text: `Qoidalar: kam qolgan — miqdor minimal zaxiradan past yoki ${LEAD_TIME_DAYS + 7} kundan kamga yetadi; tavsiya — 30 kunlik sarf + minimal zaxira − joriy miqdor; yetkazib berish muddati ${LEAD_TIME_DAYS} kun deb olingan.` }),
      ]),
    ]),
    el('div', { class: 'insight-grid' }, [
      el('section', { class: 'card' }, [
        el('h3', { class: 'section-title' }, [icon('trending-down'), 'Qaysi mahsulotlar kamaymoqda?']),
        a.declining.length ? el('ul', { class: 'insight-list' }, a.declining.map((r) => li(r.it.name, `${fmtNum(r.it.qty)} ${r.it.unit} · taxminan ${Math.floor(r.cover)} kunga yetadi · min. ${r.it.min}`, r.it.qty < r.it.min ? 'warning' : 'muted'))) : el('p', { class: 'muted', text: 'Kamayayotgan mahsulot yoʻq.' }),
      ]),
      el('section', { class: 'card' }, [
        el('h3', { class: 'section-title' }, [icon('calendar-clock'), 'Qaysi mahsulotlar muddati yaqin?']),
        a.expiring.length ? el('ul', { class: 'insight-list' }, a.expiring.map((r) => li(r.it.name, r.st.left < 0 ? `Muddati ${-r.st.left} kun oldin tugagan — sotuvdan olib qoʻying` : `${fmtDate(r.it.expiry)} · ${r.st.left} kun qoldi · ${fmtNum(r.it.qty)} ${r.it.unit}`, r.st.left < 0 ? 'danger' : 'warning'))) : el('p', { class: 'muted', text: 'Muddati yaqin mahsulot yoʻq.' }),
      ]),
      el('section', { class: 'card' }, [
        el('h3', { class: 'section-title' }, [icon('package-plus'), 'Qayta buyurtma tavsiyasi']),
        a.reorder.length ? el('ul', { class: 'insight-list' }, a.reorder.map((r) => li(r.it.name, `Tavsiya: ${r.suggest} ${r.it.unit} (≈ ${fmtSom(r.suggest * r.it.price)})`, 'success', orderBtn(r)))) : el('p', { class: 'muted', text: 'Hozircha buyurtma kerak emas.' }),
      ]),
    ]),
    el('section', { class: 'card' }, [el('h3', { class: 'section-title' }, [icon('chart-column'), 'Miqdor va minimal zaxira (eng xavfli 8 ta)']), riskBars(a)]),
  ]);
}

/* ---------------- Diagrammalar (oddiy SVG, kutubxonasiz) ---------------- */
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, children = []) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  children.forEach((c) => n.append(c));
  return n;
};
const txt = (s, attrs) => { const t = svg('text', attrs); t.textContent = s; return t; };

function outflowChart() {
  const { movements } = getState();
  const days = Array.from({ length: 14 }, (_, i) => dayOffset(i - 13));
  const totals = days.map((d) => movements.filter((m) => m.type === 'out' && isoDay(m.at) === isoDay(d)).reduce((s, m) => s + m.qty, 0));
  const max = Math.max(...totals, 1);
  const W = 560; const H = 200; const pad = { l: 36, r: 8, t: 12, b: 28 };
  const bw = (W - pad.l - pad.r) / days.length;
  const g = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Oxirgi 14 kunlik kunlik chiqim diagrammasi' });
  [0, 0.5, 1].forEach((f) => {
    const y = pad.t + (H - pad.t - pad.b) * (1 - f);
    g.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: 'chart__grid' }));
    g.append(txt(String(Math.round(max * f)), { x: pad.l - 6, y: y + 4, class: 'chart__axis', 'text-anchor': 'end' }));
  });
  totals.forEach((v, i) => {
    const h = ((H - pad.t - pad.b) * v) / max;
    const x = pad.l + i * bw + bw * 0.18;
    g.append(svg('rect', { x, y: H - pad.b - h, width: bw * 0.64, height: Math.max(h, 1), rx: 4, class: i === totals.length - 1 ? 'chart__bar chart__bar--last' : 'chart__bar' }, [svg('title', {}, [document.createTextNode(`${fmtDate(days[i])}: ${v}`)])]));
    if (i % 2 === 1 || i === totals.length - 1) g.append(txt(`${weekdayShort(days[i])} ${days[i].getDate()}`, { x: x + bw * 0.32, y: H - 8, class: 'chart__axis', 'text-anchor': 'middle' }));
  });
  return el('div', { class: 'chart-wrap' }, [g]);
}

function statusDonut() {
  const { counts, rows } = analyze();
  const by = (k) => rows.filter((r) => r.st.key === k).length; // har bir pozitsiya faqat bitta holatda
  const parts = [['Meʼyorda', by('ok'), 'var(--emerald)'], ['Kam qolgan', by('low'), 'var(--warning)'], ['Muddati yaqin', by('expiring'), 'var(--purple)'], ['Muddati oʻtgan', by('expired'), 'var(--danger)']];
  const total = parts.reduce((s, p) => s + p[1], 0) || 1;
  const R = 54; const C = 2 * Math.PI * R;
  const g = svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'img', 'aria-label': 'Zaxira holati taqsimoti' });
  g.append(svg('circle', { cx: 70, cy: 70, r: R, class: 'donut__track' }));
  let offset = 0;
  parts.forEach(([, v, color]) => {
    if (!v) return;
    const len = (v / total) * C;
    g.append(svg('circle', { cx: 70, cy: 70, r: R, class: 'donut__seg', stroke: color, 'stroke-dasharray': `${len} ${C - len}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 70 70)' }));
    offset += len;
  });
  g.append(txt(String(counts.total), { x: 70, y: 70, class: 'donut__value', 'text-anchor': 'middle' }));
  g.append(txt('pozitsiya', { x: 70, y: 88, class: 'donut__label', 'text-anchor': 'middle' }));
  const legend = el('ul', { class: 'legend' }, parts.map(([label, v, color]) => {
    const dot = el('span', { class: 'legend__dot' }); dot.style.background = color;
    return el('li', {}, [dot, el('span', { text: label }), el('strong', { text: String(v) })]);
  }));
  return el('div', { class: 'donut-wrap' }, [g, legend]);
}

function riskBars(a) {
  const rows = [...a.rows].sort((x, y) => (x.it.qty / x.it.min) - (y.it.qty / y.it.min)).slice(0, 8);
  return el('div', { class: 'risk-bars' }, rows.map(({ it }) => {
    const max = Math.max(it.qty, it.min) * 1.25;
    const fill = el('span', { class: `risk-bar__fill${it.qty < it.min ? ' risk-bar__fill--low' : ''}` }); fill.style.width = `${(it.qty / max) * 100}%`;
    const mark = el('span', { class: 'risk-bar__min' }); mark.style.left = `${(it.min / max) * 100}%`;
    return el('div', { class: 'risk-bar' }, [
      el('span', { class: 'risk-bar__name', text: it.name }),
      el('span', { class: 'risk-bar__track' }, [fill, mark]),
      el('span', { class: 'risk-bar__val mono', text: `${it.qty} / ${it.min}` }),
    ]);
  }));
}

/* ---------------- Kirim / chiqim formasi ---------------- */
function openMovement(itemId, type = 'out', qty = '') {
  const { items } = getState();
  const sel = el('select', { class: 'input', id: 'moveItem' }, items.map((i) => el('option', { value: i.id, text: `${i.name} (${i.qty} ${i.unit})`, selected: i.id === itemId })));
  const typeRow = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Harakat turi' }, [['in', 'Kirim', 'arrow-down-to-line'], ['out', 'Chiqim', 'arrow-up-from-line']].map(([v, l, ic]) =>
    el('label', { class: 'seg__opt' }, [el('input', { type: 'radio', name: 'moveType', value: v, checked: v === type }), icon(ic), l])));
  const qtyIn = el('input', { class: 'input', id: 'moveQty', type: 'number', min: 1, max: 10000, step: 1, value: qty, inputmode: 'numeric', placeholder: 'Masalan: 20' });
  const note = el('input', { class: 'input', id: 'moveNote', maxlength: 80, placeholder: 'Masalan: distribyutordan kirim' });
  const err = el('p', { class: 'form-error', role: 'alert', hidden: true });
  const body = el('div', { class: 'form-stack' }, [
    el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Dori vositasi' }), sel]),
    el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'Turi' }), typeRow]),
    el('div', { class: 'grid-2 grid-2--tight' }, [
      el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Miqdor' }), qtyIn]),
      el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Izoh (ixtiyoriy)' }), note]),
    ]),
    err,
  ]);
  openModal({
    title: 'Kirim / chiqim',
    body,
    actions: [
      { label: 'Bekor qilish', variant: 'secondary' },
      { label: 'Saqlash', variant: 'primary', icon: 'check', onClick: () => {
        const it = items.find((i) => i.id === sel.value);
        const t = body.querySelector('input[name="moveType"]:checked').value;
        const n = Number.parseInt(qtyIn.value, 10);
        if (!Number.isInteger(n) || n < 1 || n > 10000) { err.textContent = 'Miqdor 1 dan 10 000 gacha butun son boʻlishi kerak.'; err.hidden = false; qtyIn.focus(); return false; }
        if (t === 'out' && n > it.qty) { err.textContent = `Omborda faqat ${it.qty} ${it.unit} bor — chiqim undan koʻp boʻla olmaydi.`; err.hidden = false; qtyIn.focus(); return false; }
        it.qty += t === 'in' ? n : -n;
        state.movements.push({ id: `m${Date.now().toString(36)}`, itemId: it.id, type: t, qty: n, note: note.value.trim() || (t === 'in' ? 'Kirim' : 'Chiqim'), at: new Date().toISOString() });
        persist();
        const st = itemStatus(it);
        toast(`${it.name}: ${t === 'in' ? '+' : '−'}${n} ${it.unit}. Qoldiq: ${it.qty}.${st.key === 'low' ? ' Diqqat: minimal zaxiradan past!' : ''}`, st.key === 'low' ? 'warning' : 'success', { timeout: 5000 });
        render();
        return true;
      } },
    ],
  });
  icons(body);
}

export function initStock() { /* hodisalar render vaqtida ulanadi */ }
