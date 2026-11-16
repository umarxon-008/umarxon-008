/**
 * Tibbiy kutubxona: atamalarni yuklash, qidirish va batafsil ko'rsatish.
 * Ma'lumotlar data/medical-terms.json dan olinadi va "ekspert tekshirmagan" deb belgilanadi.
 */
import { $, el, icon, icons, normalize, debounce, formatDate } from './utils.js';
import { openModal, closeModal, emptyState, errorState, skeleton } from './ui.js';

let cache = null;

export async function loadLibrary() {
  if (cache) return cache;
  let data = window.MEDAI_TERMS; // yig'ilgan versiyada sahifaga joylangan (file:// uchun)
  if (!data) {
    const res = await fetch('data/medical-terms.json');
    if (!res.ok) throw new Error('library');
    data = await res.json();
  }
  cache = {
    meta: data.meta,
    terms: data.terms.map((t) => ({
      ...t,
      _aliases: [...new Set([t.term, ...t.aliases].map(normalize))],
      _search: normalize([t.term, ...t.aliases, t.simple, t.category].join(' ')),
    })),
  };
  return cache;
}

/** Laboratoriya ko'rsatkichi nomiga mos atama (masalan "Gemoglobin (HGB)" -> Gemoglobin). */
export function matchTerm(name) {
  if (!cache) return null;
  const n = normalize(name);
  if (!n) return null;
  const wordRe = (a) => new RegExp(`(^|[^\\p{L}\\p{N}])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u');
  return cache.terms.find((t) => t._aliases.some((a) => n === a || wordRe(a).test(n))) || null;
}

let state = { query: '', category: 'Barchasi' };
let askHandler = () => {};

export function initLibrary({ onAsk }) {
  askHandler = onAsk;
  const input = $('#librarySearch');
  input.addEventListener('input', debounce(() => { state.query = input.value; render(); }, 120));
  $('#libraryClear').addEventListener('click', () => {
    input.value = '';
    state.query = '';
    render();
    input.focus();
  });
  $('#libraryFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    render();
  });
  $('#libraryGrid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-term]');
    if (card) openTerm(card.dataset.term);
  });
}

export async function showLibrary() {
  const grid = $('#libraryGrid');
  if (!cache) {
    grid.replaceChildren(...Array.from({ length: 6 }, () => el('div', { class: 'card term-card term-card--loading' }, [skeleton(4)])));
    try {
      await loadLibrary();
    } catch {
      grid.replaceChildren(errorState({ title: 'Kutubxonani yuklab boʻlmadi', text: 'Server bilan aloqani tekshirib, qayta urinib koʻring.', onRetry: showLibrary }));
      icons(grid);
      return;
    }
  }
  render();
}

function render() {
  if (!cache) return;
  const grid = $('#libraryGrid');
  const q = normalize(state.query);
  $('#libraryClear').hidden = !q;

  const categories = ['Barchasi', ...new Set(cache.terms.map((t) => t.category))];
  $('#libraryFilters').replaceChildren(...categories.map((c) =>
    el('button', { type: 'button', class: `chip${c === state.category ? ' is-active' : ''}`, 'aria-pressed': String(c === state.category), dataset: { category: c } }, [c])));

  const list = cache.terms.filter((t) =>
    (state.category === 'Barchasi' || t.category === state.category) && (!q || t._search.includes(q)));

  $('#libraryCount').textContent = `${list.length} ta atama`;

  if (!list.length) {
    grid.replaceChildren(emptyState({
      iconName: 'search-x',
      title: 'Hech narsa topilmadi',
      text: q ? `«${state.query}» boʻyicha kutubxonada atama yoʻq. Boshqa soʻz bilan qidirib koʻring.` : 'Bu turkumda atama yoʻq.',
      action: el('button', { type: 'button', class: 'btn btn--secondary', onClick: () => { $('#librarySearch').value = ''; state = { query: '', category: 'Barchasi' }; render(); } }, [icon('rotate-ccw'), 'Filtrlarni tozalash']),
    }));
  } else {
    grid.replaceChildren(...list.map((t) =>
      el('button', { type: 'button', class: 'card term-card', dataset: { term: t.id }, 'aria-label': `${t.term} — batafsil` }, [
        el('div', { class: 'term-card__head' }, [
          el('span', { class: 'term-card__icon' }, [icon(categoryIcon(t.category))]),
          el('span', { class: 'badge badge--soft', text: t.category }),
        ]),
        el('h3', { class: 'term-card__title', text: t.term }),
        el('p', { class: 'term-card__text', text: t.simple }),
        el('span', { class: 'term-card__more' }, ['Batafsil', icon('arrow-right')]),
      ])));
  }
  icons(grid);
  icons($('#libraryFilters'));
}

function categoryIcon(c) {
  return { 'Qon tahlili': 'droplet', Biokimyo: 'flask-conical', Umumiy: 'heart-pulse' }[c] || 'book-open';
}

export async function openTerm(id) {
  await loadLibrary();
  const t = cache.terms.find((x) => x.id === id);
  if (!t) return;
  const body = el('div', { class: 'term-detail' }, [
    el('div', { class: 'notice notice--warning' }, [
      icon('badge-info'),
      el('p', {}, [el('strong', { text: 'Ekspert tekshirmagan. ' }), 'Bu matn umumiy maʼlumot uchun; rasmiy tibbiy fakt yoki shifokor maslahati emas.']),
    ]),
    section('Sodda taʼrif', 'smile', el('p', { text: t.simple })),
    section('Tibbiy izoh', 'stethoscope', el('p', { text: t.medical })),
    t.warning ? el('div', { class: 'notice notice--danger' }, [icon('siren'), el('p', { text: t.warning })]) : null,
    section('Nima bilan bogʻliq', 'link', el('div', { class: 'chip-row' }, t.related.map((r) => el('span', { class: 'chip chip--static', text: r })))),
    section('Qoʻshimcha oʻqish uchun manba', 'external-link', el('ul', { class: 'source-list' }, t.sources.map((s) =>
      el('li', {}, [
        el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, [s.title, icon('external-link', 'inline-icon')]),
        el('small', { text: s.org }),
      ])))),
    el('p', { class: 'muted small', text: `Maʼlumot sanasi: ${formatDate(cache.meta.updatedAt)} · Havolalar mazmuni MEDAI matni bilan avtomatik solishtirilmagan.` }),
  ]);
  openModal({
    title: t.term,
    body,
    size: 'lg',
    actions: [
      { label: 'Yopish', variant: 'secondary' },
      { label: 'AI yordamchidan soʻrash', variant: 'primary', icon: 'message-square', onClick: () => { closeModal(true); askHandler(`${t.term} nima va u nimani koʻrsatadi?`); } },
    ],
  });
}

function section(title, iconName, content) {
  return el('section', { class: 'term-detail__section' }, [el('h3', {}, [icon(iconName), title]), content]);
}
