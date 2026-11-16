/**
 * PHARMA TRACE — dori vositalarining kelib chiqishi, partiyasi va ta'minot zanjirini kuzatish (DEMO).
 * Ma'lumotlar namunaviy: davlat reestri yoki real sertifikatlash tizimiga ulanmagan.
 */
import { $, el, icon, icons, normalize, copyText } from '../utils.js';
import { toast, openModal, emptyState } from '../ui.js';
import { TRACE_PRODUCTS, STAGES } from '../data/trace-data.js';
import { moduleHero, demoNotice, kpi, dayOffset, daysUntil, fmtDate, loadState, saveState } from './common.js';

export const STATUS = {
  verified: { label: 'Tekshirilgan', icon: 'shield-check', tone: 'success', short: 'Maʼlumotlar mos keldi' },
  pending: { label: 'Maʼlumot kutilmoqda', icon: 'hourglass', tone: 'warning', short: 'Ayrim bosqichlar tasdiqlanmagan' },
  suspicious: { label: 'Shubhali', icon: 'shield-alert', tone: 'danger', short: 'Nomuvofiqliklar aniqlandi' },
};
const STATE_LABEL = { done: 'Bajarildi', current: 'Jarayonda', pending: 'Kutilmoqda', issue: 'Muammo' };

let query = '';
let selectedId = null;

export const traceProducts = () => TRACE_PRODUCTS;
export const traceSummary = () => ({
  total: TRACE_PRODUCTS.length,
  verified: TRACE_PRODUCTS.filter((p) => p.status === 'verified').length,
  pending: TRACE_PRODUCTS.filter((p) => p.status === 'pending').length,
  suspicious: TRACE_PRODUCTS.filter((p) => p.status === 'suspicious'),
});

function search(q) {
  const n = normalize(q).replace(/\s+/g, ' ');
  if (!n) return [];
  return TRACE_PRODUCTS.filter((p) => [p.name, p.substance, p.id, p.qr, p.batch, p.manufacturer.name, p.category]
    .some((v) => normalize(v).includes(n)));
}

export function showTrace(param) {
  if (param && TRACE_PRODUCTS.some((p) => p.id === param)) { selectedId = param; query = param; }
  render();
}

function render() {
  const root = $('#view-trace .page');
  const s = traceSummary();
  const results = query ? search(query) : [];
  const selected = TRACE_PRODUCTS.find((p) => p.id === selectedId) || null;

  root.replaceChildren(...[
    moduleHero({ key: 'trace', iconName: 'scan-search', title: 'PHARMA TRACE', subtitle: 'Dori vositalarining kelib chiqishi, partiyasi va taʼminot zanjirini kuzatish' }),
    demoNotice('Bu boʻlimdagi barcha mahsulot, ishlab chiqaruvchi va dorixona maʼlumotlari namunaviy. Platforma hozircha davlat dori reestri yoki real sertifikatlash tizimiga ulanmagan.'),
    el('div', { class: 'kpi-row' }, [
      kpi({ label: 'Kuzatuvdagi mahsulotlar', value: s.total, iconName: 'package', tone: 'teal' }),
      kpi({ label: 'Tekshirilgan', value: s.verified, iconName: 'shield-check', tone: 'success' }),
      kpi({ label: 'Maʼlumot kutilmoqda', value: s.pending, iconName: 'hourglass', tone: 'warning' }),
      kpi({ label: 'Shubhali', value: s.suspicious.length, iconName: 'shield-alert', tone: 'danger' }),
    ]),
    searchCard(),
    query && !selected ? resultsList(results) : null,
    selected ? detail(selected) : null,
    !query && !selected ? catalog() : null,
  ].filter(Boolean));
  icons(root);
}

function searchCard() {
  const input = el('input', {
    type: 'search', id: 'traceSearch', class: 'input', value: query, autocomplete: 'off', maxlength: 60,
    placeholder: 'Dori nomi, mahsulot ID, partiya raqami yoki QR kod…', 'aria-label': 'Mahsulotni qidirish',
  });
  const form = el('form', { class: 'trace-search', novalidate: true }, [
    el('div', { class: 'search-box' }, [icon('search'), input]),
    el('button', { type: 'submit', class: 'btn btn--primary' }, [icon('scan-search'), 'Tekshirish']),
  ]);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) { toast('Qidirish uchun dori nomi, ID yoki QR kodni kiriting.', 'warning'); input.focus(); return; }
    query = v;
    const found = search(v);
    selectedId = found.length === 1 ? found[0].id : null;
    if (selectedId) history.replaceState(null, '', `#/trace/${selectedId}`);
    render();
    $('#traceResultsAnchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  const chips = el('div', { class: 'chip-row' }, [
    el('span', { class: 'muted small', text: 'QR kod namunalari:' }),
    ...TRACE_PRODUCTS.slice(0, 5).map((p) => el('button', {
      type: 'button', class: `chip chip--code chip--${STATUS[p.status].tone}`, dataset: { code: p.qr }, 'aria-label': `${p.name} — ${p.qr}`,
    }, [icon('qr-code'), p.qr])),
  ]);
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('[data-code]');
    if (!c) return;
    query = c.dataset.code;
    selectedId = search(query)[0]?.id || null;
    history.replaceState(null, '', `#/trace/${selectedId}`);
    render();
  });

  return el('section', { class: 'card trace-search-card', id: 'traceResultsAnchor' }, [
    el('div', { class: 'card__head' }, [
      el('div', {}, [
        el('h3', { class: 'card__title' }, [icon('qr-code'), 'Mahsulotni tekshirish']),
        el('p', { class: 'muted', text: 'Qadoqdagi QR kod ostidagi identifikatorni yoki partiya raqamini kiriting. Kamera orqali skanerlash keyingi bosqichda qoʻshiladi.' }),
      ]),
    ]),
    form,
    chips,
  ]);
}

function statusBadge(status, big = false) {
  const st = STATUS[status];
  return el('span', { class: `status-badge status-badge--${st.tone}${big ? ' status-badge--lg' : ''}` }, [icon(st.icon), st.label]);
}

function productRow(p) {
  return el('button', { type: 'button', class: 'trace-row', dataset: { id: p.id } }, [
    el('span', { class: `trace-row__icon trace-row__icon--${STATUS[p.status].tone}` }, [icon('pill')]),
    el('span', { class: 'trace-row__text' }, [
      el('strong', { text: p.name }),
      el('small', { text: `${p.form} · ${p.manufacturer.name}` }),
      el('small', { class: 'mono', text: `${p.id} · Partiya ${p.batch}` }),
    ]),
    statusBadge(p.status),
    icon('chevron-right', 'trace-row__chev'),
  ]);
}

function bindRows(container) {
  container.addEventListener('click', (e) => {
    const r = e.target.closest('[data-id]');
    if (!r) return;
    selectedId = r.dataset.id;
    query = selectedId;
    history.replaceState(null, '', `#/trace/${selectedId}`);
    render();
  });
  return container;
}

function resultsList(list) {
  if (!list.length) {
    return el('div', { class: 'card' }, [emptyState({
      iconName: 'search-x', title: 'Mahsulot topilmadi',
      text: `«${query}» boʻyicha namunaviy bazada mahsulot yoʻq. Kodni tekshiring yoki namunalardan birini tanlang.`,
      action: el('button', { type: 'button', class: 'btn btn--secondary', onClick: () => { query = ''; selectedId = null; history.replaceState(null, '', '#/trace'); render(); } }, [icon('rotate-ccw'), 'Qidiruvni tozalash']),
    })]);
  }
  return el('section', { class: 'card' }, [
    el('h3', { class: 'section-title' }, [icon('list-checks'), `Topilgan mahsulotlar: ${list.length}`]),
    bindRows(el('div', { class: 'trace-list' }, list.map(productRow))),
  ]);
}

function catalog() {
  return el('section', { class: 'card' }, [
    el('div', { class: 'section-title-row' }, [
      el('h3', { class: 'section-title' }, [icon('package'), 'Namunaviy mahsulotlar']),
      el('span', { class: 'muted small', text: 'Batafsil koʻrish uchun tanlang' }),
    ]),
    bindRows(el('div', { class: 'trace-list' }, TRACE_PRODUCTS.map(productRow))),
  ]);
}

function infoItem(label, value, mono = false) {
  return el('div', { class: 'info-item' }, [el('span', { class: 'info-item__label', text: label }), el('strong', { class: mono ? 'mono' : '', text: value })]);
}

function detail(p) {
  const st = STATUS[p.status];
  const expiry = dayOffset(p.expiry);
  const left = daysUntil(expiry);
  const expiryText = left < 0 ? `Muddati oʻtgan (${-left} kun oldin)` : left <= 90 ? `${left} kun qoldi — muddati yaqin` : `${left} kun qoldi`;

  const steps = p.chain.map((c, i) => el('li', { class: `chain-step chain-step--${c.state}` }, [
    el('span', { class: 'chain-step__dot' }, [icon(c.state === 'issue' ? 'triangle-alert' : STAGES[c.stage].icon)]),
    el('div', { class: 'chain-step__body' }, [
      el('span', { class: 'chain-step__stage', text: `${i + 1}. ${STAGES[c.stage].label}` }),
      el('strong', { text: c.org }),
      el('span', { class: 'chain-step__meta' }, [
        c.place && c.place !== '—' ? el('span', {}, [icon('map-pin'), c.place]) : null,
        c.day !== null ? el('span', {}, [icon('calendar-days'), fmtDate(dayOffset(c.day))]) : null,
        c.temp && c.temp !== '—' ? el('span', {}, [icon('thermometer'), c.temp]) : null,
      ]),
      c.note ? el('p', { text: c.note }) : null,
      el('span', { class: `chain-state chain-state--${c.state}`, text: STATE_LABEL[c.state] }),
    ]),
  ]));

  const back = el('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, [icon('arrow-left'), 'Barcha mahsulotlar']);
  back.addEventListener('click', () => { selectedId = null; query = ''; history.replaceState(null, '', '#/trace'); render(); });

  const report = el('button', { type: 'button', class: `btn ${p.status === 'suspicious' ? 'btn--danger' : 'btn--secondary'}` }, [icon('flag'), 'Shubhali holat haqida xabar berish']);
  report.addEventListener('click', () => openReport(p));
  const copy = el('button', { type: 'button', class: 'btn btn--ghost' }, [icon('copy'), 'Maʼlumotni nusxalash']);
  copy.addEventListener('click', async () => {
    const text = `${p.name} (${p.form})\nMahsulot ID: ${p.id}\nPartiya: ${p.batch}\nIshlab chiqaruvchi: ${p.manufacturer.name}\nHolat: ${st.label}\nYaroqlilik muddati: ${fmtDate(expiry)}\n(Demo maʼlumot — MEDPERFECT PHARMA TRACE)`;
    const ok = await copyText(text);
    toast(ok ? 'Maʼlumot nusxalandi.' : 'Nusxalab boʻlmadi.', ok ? 'success' : 'error');
  });

  return el('section', { class: `card trace-detail trace-detail--${st.tone}` }, [
    el('div', { class: 'trace-detail__top' }, [back, el('span', { class: 'mode-badge mode-badge--demo' }, [icon('flask-conical'), 'Namunaviy mahsulot'])]),
    el('div', { class: 'trace-detail__head' }, [
      el('div', {}, [
        el('p', { class: 'eyebrow', text: p.category }),
        el('h3', { class: 'card__title card__title--lg', text: p.name }),
        el('p', { class: 'muted', text: p.form }),
      ]),
      statusBadge(p.status, true),
    ]),
    el('div', { class: `notice notice--${st.tone === 'success' ? 'success' : st.tone === 'warning' ? 'warning' : 'danger'}` }, [icon(st.icon), el('p', { text: p.statusNote })]),
    el('div', { class: 'info-grid' }, [
      infoItem('Faol modda', p.substance),
      infoItem('Ishlab chiqaruvchi', p.manufacturer.name),
      infoItem('Mamlakat', p.manufacturer.country),
      infoItem('Litsenziya (demo)', p.manufacturer.license, true),
      infoItem('Partiya (Batch ID)', p.batch, true),
      infoItem('Mahsulot ID', p.id, true),
      infoItem('QR kod', p.qr, true),
      infoItem('Ishlab chiqarilgan', fmtDate(dayOffset(p.mfg))),
      el('div', { class: `info-item${left <= 90 ? ' info-item--warn' : ''}` }, [
        el('span', { class: 'info-item__label', text: 'Yaroqlilik muddati' }),
        el('strong', { text: fmtDate(expiry) }),
        el('small', { text: expiryText }),
      ]),
    ]),
    el('h4', { class: 'section-title' }, [icon('route'), 'Taʼminot zanjiri']),
    el('ol', { class: 'chain' }, steps),
    el('div', { class: 'btn-row' }, [report, copy]),
  ]);
}

function openReport(p) {
  const reports = loadState('trace.reports', []);
  const reason = el('select', { class: 'input', id: 'reportReason' }, [
    'Qadoq shikastlangan yoki oʻzgartirilgan', 'QR kod / partiya raqami mos emas', 'Narx yoki sotuv joyi shubhali', 'Boshqa sabab',
  ].map((t) => el('option', { value: t, text: t })));
  const note = el('textarea', { class: 'input textarea', id: 'reportNote', rows: 3, maxlength: 300, placeholder: 'Qisqa izoh (ixtiyoriy)…' });
  const body = el('div', { class: 'form-stack' }, [
    demoNotice('Demo: xabar hech qayerga yuborilmaydi va nazorat organiga yetkazilmaydi. Real versiyada bu xabar tegishli organ va ishlab chiqaruvchiga joʻnatiladi.'),
    el('div', { class: 'field' }, [el('span', { class: 'field__label', text: 'Mahsulot' }), el('strong', { text: `${p.name} · ${p.batch}` })]),
    el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Sabab' }), reason]),
    el('label', { class: 'field' }, [el('span', { class: 'field__label', text: 'Izoh' }), note]),
  ]);
  openModal({
    title: 'Shubhali holat haqida xabar',
    body,
    actions: [
      { label: 'Bekor qilish', variant: 'secondary' },
      { label: 'Xabarni saqlash (demo)', variant: 'primary', icon: 'flag', onClick: () => {
        reports.push({ productId: p.id, reason: reason.value, note: note.value.trim().slice(0, 300), at: new Date().toISOString() });
        saveState('trace.reports', reports);
        toast('Demo: xabar shu qurilmada saqlandi. Real tizimga yuborilmadi.', 'success', { timeout: 5000 });
      } },
    ],
  });
}

export function initTrace() { /* hodisalar render vaqtida ulanadi */ }
