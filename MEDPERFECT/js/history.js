/**
 * Suhbatlar tarixi: ro'yxat, qidiruv, ochish, o'chirish.
 * Tarix faqat shu qurilmaning brauzerida (localStorage) saqlanadi.
 */
import { $, el, icon, icons, normalize, formatRelative, formatDateTime, stripMarkdown, debounce } from './utils.js';
import { store } from './store.js';
import { toast, confirmDialog, emptyState } from './ui.js';

let query = '';
let handlers = {};

export function initHistory({ onOpen, onNew }) {
  handlers = { onOpen, onNew };
  $('#historySearch').addEventListener('input', debounce((e) => { query = e.target.value; renderHistory(); }, 120));
  $('#historyDeleteAll').addEventListener('click', deleteAll);
  $('#historyNew').addEventListener('click', onNew);
  $('#historyList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    if (btn.dataset.action === 'open') onOpen(id);
    if (btn.dataset.action === 'delete') deleteOne(id);
  });
  store.subscribe(() => { renderRecent(); if (!$('#view-history').hidden) renderHistory(); });
  renderRecent();
}

const lastMessage = (c) => c.messages[c.messages.length - 1];

export function renderHistory() {
  const list = $('#historyList');
  const q = normalize(query);
  const all = store.conversations().filter((c) => c.messages.length > 0);
  const items = all.filter((c) => !q || normalize(c.title).includes(q) || c.messages.some((m) => normalize(m.content).includes(q)));

  $('#historyStorageOff').hidden = store.settings.saveHistory;
  $('#historyDeleteAll').disabled = all.length === 0;
  $('#historyCount').textContent = `${all.length} ta suhbat`;

  if (!items.length) {
    list.replaceChildren(all.length
      ? emptyState({ iconName: 'search-x', title: 'Hech narsa topilmadi', text: `«${query}» boʻyicha suhbat topilmadi.` })
      : emptyState({
        iconName: 'messages-square',
        title: 'Hali suhbatlar yoʻq',
        text: 'AI yordamchiga birinchi savolingizni bering — suhbat shu yerda paydo boʻladi.',
        action: el('button', { type: 'button', class: 'btn btn--primary', onClick: handlers.onNew }, [icon('message-square-plus'), 'Yangi suhbat']),
      }));
    icons(list);
    return;
  }

  list.replaceChildren(...items.map((c) => {
    const last = lastMessage(c);
    const preview = last?.error ? 'Javob olinmagan' : stripMarkdown(last?.content || '').replace(/\s+/g, ' ').slice(0, 140);
    return el('li', { class: `history-item${c.id === store.activeId ? ' is-active' : ''}`, dataset: { id: c.id } }, [
      el('button', { type: 'button', class: 'history-item__main', dataset: { action: 'open' }, 'aria-label': `${c.title} suhbatini ochish` }, [
        el('span', { class: 'history-item__icon' }, [icon('message-square')]),
        el('span', { class: 'history-item__text' }, [
          el('strong', { text: c.title }),
          el('span', { class: 'history-item__preview', text: preview }),
          el('span', { class: 'history-item__meta' }, [
            el('time', { datetime: c.updatedAt, title: formatDateTime(c.updatedAt), text: formatRelative(c.updatedAt) }),
            ` · ${c.messages.length} ta xabar`,
          ]),
        ]),
      ]),
      el('button', { type: 'button', class: 'icon-btn icon-btn--danger', dataset: { action: 'delete', tooltip: 'Suhbatni oʻchirish' }, 'aria-label': `${c.title} suhbatini oʻchirish` }, [icon('trash-2')]),
    ]);
  }));
  icons(list);
}

/** Sidebar dagi "So'nggi suhbatlar". */
export function renderRecent() {
  const ul = $('#recentList');
  const items = store.conversations().filter((c) => c.messages.length > 0).slice(0, 6);
  if (!items.length) {
    ul.replaceChildren(el('li', { class: 'recent-empty', text: 'Hali suhbatlar yoʻq' }));
    return;
  }
  ul.replaceChildren(...items.map((c) => el('li', {}, [
    el('a', {
      href: `#/chat/${c.id}`,
      class: `recent-item${c.id === store.activeId ? ' is-active' : ''}`,
      title: c.title,
      'aria-current': c.id === store.activeId ? 'true' : null,
    }, [
      el('span', { class: 'recent-item__title', text: c.title }),
      el('time', { datetime: c.updatedAt, text: formatRelative(c.updatedAt) }),
    ]),
  ])));
}

async function deleteOne(id) {
  const conv = store.get(id);
  if (!conv) return;
  const ok = await confirmDialog({
    title: 'Suhbatni oʻchirish',
    message: `«${conv.title}» suhbati butunlay oʻchiriladi. Bu amalni qaytarib boʻlmaydi.`,
    confirmLabel: 'Oʻchirish',
    danger: true,
  });
  if (!ok) return;
  store.remove(id);
  toast('Suhbat oʻchirildi.', 'success');
}

async function deleteAll() {
  const ok = await confirmDialog({
    title: 'Barcha suhbatlarni oʻchirish',
    message: 'Ushbu qurilmadagi barcha suhbatlar oʻchiriladi. Bu amalni qaytarib boʻlmaydi.',
    confirmLabel: 'Barchasini oʻchirish',
    danger: true,
  });
  if (!ok) return;
  store.removeAll();
  toast('Barcha suhbatlar oʻchirildi.', 'success');
}
