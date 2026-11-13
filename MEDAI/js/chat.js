/**
 * AI yordamchi — asosiy chat moduli.
 * Xabar yuborish, javobni xavfsiz Markdown sifatida ko'rsatish, manbalar, nusxalash,
 * fikr bildirish, xato holatida qayta urinish va takroriy so'rovlarni cheklash.
 */
import { $, el, icon, icons, renderMarkdown, stripMarkdown, formatTime, formatDate, copyText, prefersReducedMotion } from './utils.js';
import { store } from './store.js';
import { api } from './api.js';
import { toast, confirmDialog } from './ui.js';
import { validateFile } from './dropzone.js';

export const MAX_CHARS = 4000;
let busy = false;
let pendingConvId = null;
let controller = null;
let onAttachFile = () => {};

export function initChat({ onAttach }) {
  onAttachFile = onAttach;
  const form = $('#composer');
  const input = $('#chatInput');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(input.value);
    }
  });
  input.addEventListener('input', () => { autosize(); updateCounter(); });

  $('#welcome').addEventListener('click', (e) => {
    const q = e.target.closest('[data-question]');
    if (q) send(q.dataset.question);
  });

  $('#attachBtn').addEventListener('click', () => $('#chatFileInput').click());
  $('#chatFileInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFile(file, ['pdf', 'jpg', 'jpeg', 'png']);
    if (!check.ok) { toast(check.error, 'error'); return; }
    onAttachFile(file);
  });

  $('#clearChatBtn').addEventListener('click', clearCurrent);
  $('#emergencyClose').addEventListener('click', () => { $('#emergencyBanner').hidden = true; });

  $('#messages').addEventListener('click', onMessageAction);
  store.subscribe((reason) => {
    if (['active', 'create', 'remove', 'remove-all', 'clear', 'wipe', 'message-remove'].includes(reason)) render();
  });
  updateCounter();
}

/** Tashqaridan savolni yozish maydoniga qo'yish (masalan, kutubxonadan). */
export function prefill(text, { autoSend = false } = {}) {
  const input = $('#chatInput');
  if (autoSend) { send(text); return; }
  input.value = text;
  autosize();
  updateCounter();
  input.focus();
}

export function newConversation() {
  if (busy) { toast('Javob tayyorlanmoqda. Iltimos, kuting.', 'warning'); return false; }
  const active = store.active();
  if (active && active.messages.length === 0) { store.setActive(active.id); } else { store.create(); }
  $('#emergencyBanner').hidden = true;
  return true;
}

async function clearCurrent() {
  const conv = store.active();
  if (!conv || !conv.messages.length) { toast('Suhbat allaqachon boʻsh.', 'info'); return; }
  if (busy) { toast('Javob tayyorlanayotganda tozalab boʻlmaydi.', 'warning'); return; }
  const ok = await confirmDialog({
    title: 'Suhbatni tozalash',
    message: 'Ushbu suhbatdagi barcha xabarlar oʻchiriladi. Bu amalni qaytarib boʻlmaydi.',
    confirmLabel: 'Tozalash',
    danger: true,
  });
  if (!ok) return;
  store.clearMessages(conv.id);
  $('#emergencyBanner').hidden = true;
  toast('Suhbat tozalandi.', 'success');
}

function autosize() {
  const input = $('#chatInput');
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
}

function updateCounter() {
  const len = $('#chatInput').value.length;
  const counter = $('#charCount');
  counter.textContent = `${len} / ${MAX_CHARS}`;
  counter.classList.toggle('is-limit', len >= MAX_CHARS * 0.9);
  $('#sendBtn').disabled = busy || !$('#chatInput').value.trim();
}

function setBusy(value) {
  busy = value;
  $('#composer').classList.toggle('is-busy', value);
  $('#chatInput').setAttribute('aria-busy', String(value));
  updateCounter();
}

/** Xabar yuborish: validatsiya -> saqlash -> javob so'rash. */
export async function send(raw) {
  const text = String(raw ?? '').trim();
  if (busy) { toast('Oldingi javob hali tayyorlanmoqda.', 'warning'); return; }
  if (!text) {
    toast('Xabar boʻsh. Savolingizni yozing.', 'warning');
    $('#chatInput').focus();
    return;
  }
  if (text.length > MAX_CHARS) {
    toast(`Xabar juda uzun: ${text.length} belgi. Maksimal — ${MAX_CHARS} belgi.`, 'error');
    return;
  }
  let conv = store.active();
  if (!conv) conv = store.create();
  if (location.hash !== `#/chat/${conv.id}`) history.replaceState(null, '', `#/chat/${conv.id}`);

  store.addMessage(conv.id, { role: 'user', content: text });
  $('#chatInput').value = '';
  autosize();
  render();
  await requestReply(conv.id);
}

async function requestReply(convId) {
  const conv = store.get(convId);
  if (!conv) return;
  const history = conv.messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, content: m.content }));
  if (!history.length || history[history.length - 1].role !== 'user') return;

  pendingConvId = convId;
  setBusy(true);
  showTyping(true);
  controller = new AbortController();
  try {
    const data = await api.chat(history, controller.signal);
    store.addMessage(convId, {
      role: 'assistant',
      content: data.reply,
      mode: data.mode,
      model: data.model || null,
      kind: data.kind || null,
      sources: data.sources || [],
      sourceNote: data.sourceNote || '',
      dataDate: data.dataDate || null,
      flags: data.flags || {},
    });
    if (data.flags?.emergency) $('#emergencyBanner').hidden = false;
  } catch (err) {
    store.addMessage(convId, { role: 'assistant', error: true, content: err.message || 'Nomaʼlum xatolik.' });
  } finally {
    controller = null;
    pendingConvId = null;
    showTyping(false);
    setBusy(false);
    if (store.activeId === convId) render();
  }
}

function showTyping(on) {
  const list = $('#messages');
  $('#typing')?.remove();
  if (on) {
    list.append(el('li', { class: 'msg msg--ai msg--typing', id: 'typing' }, [
      avatar(),
      el('div', { class: 'msg__body' }, [
        el('div', { class: 'bubble bubble--ai' }, [
          el('div', { class: 'typing', role: 'status' }, [
            el('span', { class: 'typing__dots', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')]),
            el('span', { text: 'MEDAI javob tayyorlamoqda…' }),
          ]),
          el('div', { class: 'skeleton-block', 'aria-hidden': 'true' }, [
            el('span', { class: 'skeleton skeleton--line skeleton--w1' }),
            el('span', { class: 'skeleton skeleton--line skeleton--w2' }),
          ]),
        ]),
      ]),
    ]));
    icons(list.lastElementChild);
    scrollToBottom();
  }
}

const avatar = () => el('span', { class: 'msg__avatar', 'aria-hidden': 'true' }, [el('img', { src: 'assets/icons/logo.svg', alt: '', width: 32, height: 32 })]);

export function render() {
  const conv = store.active();
  const messages = conv?.messages || [];
  const list = $('#messages');
  $('#welcome').hidden = messages.length > 0;
  $('#chatToolbar').hidden = messages.length === 0;
  $('#chatTitle').textContent = conv?.title || 'Yangi suhbat';

  const greet = store.settings.name ? `Salom, ${store.settings.name}!` : 'Salom!';
  $('#welcomeGreeting').textContent = `${greet} Men MEDAI`;

  list.replaceChildren(...messages.map(renderMessage));
  if (busy && conv && conv.id === pendingConvId) showTyping(true);
  icons(list);
  if (messages.length) scrollToBottom(false);
  else $('#chatScroll').scrollTop = 0; // bo'sh suhbatda salomlashuv boshidan ko'rinsin
  updateCounter();
}

function renderMessage(m) {
  if (m.role === 'user') {
    return el('li', { class: 'msg msg--user', dataset: { id: m.id } }, [
      el('div', { class: 'msg__body' }, [
        el('div', { class: 'bubble bubble--user', text: m.content }),
        el('div', { class: 'msg__meta' }, [el('time', { datetime: m.createdAt, text: formatTime(m.createdAt) })]),
      ]),
    ]);
  }

  if (m.error) {
    return el('li', { class: 'msg msg--ai msg--error', dataset: { id: m.id } }, [
      avatar(),
      el('div', { class: 'msg__body' }, [
        el('div', { class: 'bubble bubble--error', role: 'alert' }, [
          el('div', { class: 'bubble__error-head' }, [icon('circle-alert'), el('strong', { text: 'Javob olinmadi' })]),
          el('p', { text: m.content }),
          el('button', { type: 'button', class: 'btn btn--secondary btn--sm', dataset: { action: 'retry' } }, [icon('rotate-ccw'), 'Qayta urinish']),
        ]),
      ]),
    ]);
  }

  const isDemo = m.mode === 'demo';
  const badge = el('span', { class: `mode-badge mode-badge--${isDemo ? 'demo' : 'ai'}` }, [
    icon(isDemo ? 'cloud-off' : 'sparkles'),
    isDemo ? 'DEMO · qoidaga asoslangan javob (AI emas)' : `AI javobi${m.model ? ` · ${m.model}` : ''}`,
  ]);

  return el('li', { class: 'msg msg--ai', dataset: { id: m.id } }, [
    avatar(),
    el('div', { class: 'msg__body' }, [
      el('div', { class: 'bubble bubble--ai' }, [
        badge,
        el('div', { class: 'md', html: renderMarkdown(m.content) }),
        renderSources(m),
      ]),
      el('div', { class: 'msg__actions' }, [
        el('time', { class: 'msg__time', datetime: m.createdAt, text: formatTime(m.createdAt) }),
        el('button', { type: 'button', class: 'icon-btn icon-btn--sm', dataset: { action: 'copy', tooltip: 'Javobni nusxalash' }, 'aria-label': 'Javobni nusxalash' }, [icon('copy')]),
        el('span', { class: 'msg__feedback-label', text: 'Bu javob foydali boʻldimi?' }),
        feedbackBtn(m, 'up'),
        feedbackBtn(m, 'down'),
      ]),
    ]),
  ]);
}

function feedbackBtn(m, value) {
  const active = m.feedback === value;
  const label = value === 'up' ? 'Ha, foydali' : 'Yoʻq, foydali emas';
  return el('button', {
    type: 'button',
    class: `icon-btn icon-btn--sm feedback-btn${active ? ' is-active' : ''}`,
    dataset: { action: 'feedback', value, tooltip: label },
    'aria-label': label,
    'aria-pressed': String(active),
  }, [icon(value === 'up' ? 'thumbs-up' : 'thumbs-down')]);
}

function renderSources(m) {
  const hasSources = m.sources?.length > 0;
  const unverified = !hasSources;
  const box = el('div', { class: `sources${unverified ? ' sources--none' : ''}` }, [
    el('div', { class: 'sources__head' }, [
      icon(hasSources ? 'book-open' : 'triangle-alert'),
      el('strong', { text: hasSources ? 'Manbalar' : 'Manba: topilmadi / tasdiqlanmagan' }),
    ]),
  ]);
  if (hasSources) {
    const seen = new Set();
    box.append(el('ul', { class: 'source-list' }, m.sources.filter((s) => !seen.has(s.url) && seen.add(s.url)).map((s) =>
      el('li', {}, [
        el('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, [s.title, icon('external-link', 'inline-icon')]),
        el('small', { text: s.org }),
      ]))));
  }
  const dateText = m.dataDate ? `Maʼlumot sanasi: ${formatDate(m.dataDate)}` : `Javob vaqti: ${formatDate(m.createdAt)}`;
  box.append(el('p', { class: 'sources__note' }, [m.sourceNote ? `${m.sourceNote} ` : '', el('span', { class: 'muted', text: dateText })]));
  return box;
}

async function onMessageAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const li = btn.closest('[data-id]');
  const conv = store.active();
  const msg = conv?.messages.find((m) => m.id === li?.dataset.id);
  if (!msg) return;

  if (btn.dataset.action === 'copy') {
    const ok = await copyText(stripMarkdown(msg.content));
    toast(ok ? 'Javob nusxalandi.' : 'Nusxalab boʻlmadi.', ok ? 'success' : 'error');
  } else if (btn.dataset.action === 'feedback') {
    const value = msg.feedback === btn.dataset.value ? null : btn.dataset.value;
    store.updateMessage(conv.id, msg.id, { feedback: value });
    li.querySelectorAll('.feedback-btn').forEach((b) => {
      const on = b.dataset.value === value;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (value) toast('Fikringiz uchun rahmat! Baho faqat shu qurilmada saqlandi.', 'success');
  } else if (btn.dataset.action === 'retry') {
    if (busy) return;
    store.removeMessage(conv.id, msg.id);
    await requestReply(conv.id);
  }
}

function scrollToBottom(smooth = true) {
  const scroller = $('#chatScroll');
  requestAnimationFrame(() => {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
  });
}

export const isChatBusy = () => busy;
