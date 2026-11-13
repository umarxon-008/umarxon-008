/**
 * UI komponentlari: toast bildirishnomalar, modal oyna, tasdiqlash dialogi,
 * mobil drawer (sidebar), profil menyusi va fokusni ushlab turish (focus trap).
 */
import { $, el, icon, icons } from './utils.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const items = [...container.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

/* ---------------- Toast ---------------- */
const TOAST_ICONS = { info: 'info', success: 'circle-check', warning: 'triangle-alert', error: 'circle-alert' };

export function toast(message, type = 'info', { timeout = 4000 } = {}) {
  const root = $('#toasts');
  if (!root) return;
  const node = el('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' }, [
    icon(TOAST_ICONS[type] || 'info', 'toast__icon'),
    el('p', { class: 'toast__text', text: message }),
    el('button', { class: 'icon-btn icon-btn--sm toast__close', type: 'button', 'aria-label': 'Bildirishnomani yopish' }, [icon('x')]),
  ]);
  const close = () => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 200);
  };
  node.querySelector('.toast__close').addEventListener('click', close);
  root.append(node);
  icons(node);
  while (root.children.length > 4) root.firstElementChild.remove();
  if (timeout) setTimeout(close, timeout);
}

/* ---------------- Modal ---------------- */
let modalState = null;

/**
 * openModal({ title, body: Node|string, actions: [{label, variant, icon, onClick, autofocus}], size })
 * onClick false qaytarsa oyna yopilmaydi. Natija: close() funksiyasi.
 */
export function openModal({ title, body, actions = [], size = 'md', onClose } = {}) {
  closeModal(true);
  const modal = $('#modal');
  const dialog = $('.modal__dialog', modal);
  dialog.className = `modal__dialog modal__dialog--${size}`;
  $('#modalTitle').textContent = title || '';
  const bodyEl = $('#modalBody');
  bodyEl.replaceChildren(typeof body === 'string' ? el('p', { text: body }) : body);
  const footer = $('#modalFooter');
  footer.replaceChildren();
  footer.hidden = actions.length === 0;
  let autofocusBtn = null;
  for (const a of actions) {
    const btn = el('button', { type: 'button', class: `btn btn--${a.variant || 'secondary'}` }, [a.icon ? icon(a.icon) : null, a.label]);
    btn.addEventListener('click', async () => {
      const result = a.onClick ? await a.onClick() : undefined;
      if (result !== false) closeModal();
    });
    if (a.autofocus) autofocusBtn = btn;
    footer.append(btn);
  }

  const previouslyFocused = document.activeElement;
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    else trapFocus(dialog, e);
  };
  modal.hidden = false;
  document.body.classList.add('has-modal');
  requestAnimationFrame(() => modal.classList.add('is-open'));
  modal.addEventListener('keydown', onKey);
  modalState = { onKey, previouslyFocused, onClose };
  icons(modal);
  (autofocusBtn || $('[data-autofocus]', bodyEl) || $('.modal__close', dialog)).focus();
  return closeModal;
}

export function closeModal(silent = false) {
  if (!modalState) return;
  const modal = $('#modal');
  const { onKey, previouslyFocused, onClose } = modalState;
  modalState = null;
  modal.removeEventListener('keydown', onKey);
  modal.classList.remove('is-open');
  modal.hidden = true;
  document.body.classList.remove('has-modal');
  if (!silent) {
    onClose?.();
    if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
  }
}

export function initModal() {
  $('#modal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeModal();
  });
}

/** Tasdiqlash dialogi. Natija: Promise<boolean> */
export function confirmDialog({ title, message, confirmLabel = 'Tasdiqlash', cancelLabel = 'Bekor qilish', danger = false }) {
  return new Promise((resolve) => {
    let decided = false;
    const done = (v) => { if (!decided) { decided = true; resolve(v); } };
    openModal({
      title,
      size: 'sm',
      body: el('div', { class: 'confirm' }, [
        el('div', { class: `confirm__icon${danger ? ' confirm__icon--danger' : ''}` }, [icon(danger ? 'triangle-alert' : 'circle-help')]),
        el('p', { text: message }),
      ]),
      actions: [
        { label: cancelLabel, variant: 'secondary', onClick: () => done(false), autofocus: true },
        { label: confirmLabel, variant: danger ? 'danger' : 'primary', icon: danger ? 'trash-2' : 'check', onClick: () => done(true) },
      ],
      onClose: () => done(false),
    });
  });
}

/* ---------------- Mobil drawer (sidebar) ---------------- */
export function initDrawer() {
  const sidebar = $('#sidebar');
  const overlay = $('#overlay');
  const menuBtn = $('#menuBtn');
  const mq = window.matchMedia('(max-width: 1023px)');

  const open = () => {
    sidebar.classList.add('is-open');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
    sidebar.removeAttribute('inert');
    $('#sidebarClose').focus();
  };
  const close = (restoreFocus = true) => {
    if (!sidebar.classList.contains('is-open')) return;
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    overlay.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
    if (mq.matches) sidebar.setAttribute('inert', '');
    if (restoreFocus) menuBtn.focus();
  };
  const sync = () => {
    if (mq.matches) { if (!sidebar.classList.contains('is-open')) sidebar.setAttribute('inert', ''); }
    else { sidebar.removeAttribute('inert'); close(false); }
  };

  menuBtn.addEventListener('click', open);
  $('#sidebarClose').addEventListener('click', () => close());
  overlay.addEventListener('click', () => close());
  sidebar.addEventListener('keydown', (e) => {
    if (!sidebar.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    else trapFocus(sidebar, e);
  });
  mq.addEventListener('change', sync);
  sync();
  return { close: () => close(false) };
}

/* ---------------- Profil menyusi ---------------- */
export function initMenu(button, panel) {
  const items = () => [...panel.querySelectorAll('[role="menuitem"]')];
  const open = () => {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    items()[0]?.focus();
  };
  const close = (focusButton = false) => {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focusButton) button.focus();
  };
  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !button.contains(e.target)) close();
  });
  panel.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Tab') close();
  });
  panel.addEventListener('click', (e) => { if (e.target.closest('[role="menuitem"]')) close(); });
  return { close };
}

/** Bo'sh holat bloki (empty state). */
export function emptyState({ iconName = 'search', title, text, action }) {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state__icon' }, [icon(iconName)]),
    el('h3', { text: title }),
    text ? el('p', { text }) : null,
    action || null,
  ]);
}

/** Xato holati bloki (error state). */
export function errorState({ title = 'Xatolik yuz berdi', text, onRetry }) {
  return el('div', { class: 'state-card state-card--error', role: 'alert' }, [
    el('div', { class: 'state-card__icon' }, [icon('circle-alert')]),
    el('div', { class: 'state-card__body' }, [
      el('h3', { text: title }),
      text ? el('p', { text }) : null,
      onRetry ? el('button', { type: 'button', class: 'btn btn--secondary btn--sm', onClick: onRetry }, [icon('rotate-ccw'), 'Qayta urinish']) : null,
    ]),
  ]);
}

/** Skeleton yuklanish bloki. */
export function skeleton(lines = 3) {
  return el('div', { class: 'skeleton-block', 'aria-hidden': 'true' },
    Array.from({ length: lines }, (_, i) => el('span', { class: `skeleton skeleton--line skeleton--w${(i % 3) + 1}` })));
}
