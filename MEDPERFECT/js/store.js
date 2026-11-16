/**
 * Mahalliy holat va saqlash (localStorage).
 * - Faqat suhbatlar va sozlamalar saqlanadi. Laboratoriya fayllari va tahlil natijalari HECH QACHON saqlanmaydi.
 * - Foydalanuvchi "tarixni saqlash"ni o'chirsa, suhbatlar faqat xotirada turadi.
 * - localStorage mavjud bo'lmasa (maxfiy rejim va h.k.) ilova xotirada ishlashda davom etadi.
 */
import { uid } from './utils.js';

const KEY = 'medai.v1';
const MAX_CONVERSATIONS = 100;
const DEFAULTS = { settings: { name: '', saveHistory: true, reduceMotion: false }, conversations: [], activeId: null };

const listeners = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      activeId: parsed.activeId || null,
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function persist() {
  try {
    const data = state.settings.saveHistory
      ? state
      : { settings: state.settings, conversations: [], activeId: null };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* Saqlash imkoni yo'q — xotirada davom etamiz */
  }
}

function emit(reason) {
  persist();
  listeners.forEach((fn) => fn(reason));
}

export const store = {
  get settings() { return state.settings; },
  get activeId() { return state.activeId; },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  conversations() {
    return [...state.conversations].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },
  get(id) { return state.conversations.find((c) => c.id === id) || null; },
  active() { return this.get(state.activeId); },

  setActive(id) {
    state.activeId = this.get(id) ? id : null;
    emit('active');
  },

  create() {
    const now = new Date().toISOString();
    const conv = { id: uid(), title: 'Yangi suhbat', createdAt: now, updatedAt: now, messages: [] };
    state.conversations.push(conv);
    if (state.conversations.length > MAX_CONVERSATIONS) {
      state.conversations = this.conversations().slice(0, MAX_CONVERSATIONS);
    }
    state.activeId = conv.id;
    emit('create');
    return conv;
  },

  addMessage(convId, msg) {
    const conv = this.get(convId);
    if (!conv) return null;
    const full = { id: uid(), createdAt: new Date().toISOString(), ...msg };
    conv.messages.push(full);
    conv.updatedAt = full.createdAt;
    if (msg.role === 'user' && conv.title === 'Yangi suhbat') conv.title = autoTitle(msg.content);
    emit('message');
    return full;
  },

  updateMessage(convId, msgId, patch) {
    const msg = this.get(convId)?.messages.find((m) => m.id === msgId);
    if (!msg) return;
    Object.assign(msg, patch);
    emit('message-update');
  },

  removeMessage(convId, msgId) {
    const conv = this.get(convId);
    if (!conv) return;
    conv.messages = conv.messages.filter((m) => m.id !== msgId);
    emit('message-remove');
  },

  clearMessages(convId) {
    const conv = this.get(convId);
    if (!conv) return;
    conv.messages = [];
    conv.title = 'Yangi suhbat';
    conv.updatedAt = new Date().toISOString();
    emit('clear');
  },

  remove(convId) {
    state.conversations = state.conversations.filter((c) => c.id !== convId);
    if (state.activeId === convId) state.activeId = null;
    emit('remove');
  },

  removeAll() {
    state.conversations = [];
    state.activeId = null;
    emit('remove-all');
  },

  updateSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    emit('settings');
  },

  /** Barcha mahalliy ma'lumotlarni o'chirish (sozlamalar ham). */
  wipe() {
    state = structuredClone(DEFAULTS);
    try {
      localStorage.removeItem(KEY);
      // MEDPERFECT modullari ma'lumotlari (yozilishlar, zaxira harakatlari va h.k.)
      Object.keys(localStorage).filter((k) => k.startsWith('medperfect.')).forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch { /* ignore */ }
    listeners.forEach((fn) => fn('wipe'));
  },
};

/** Birinchi savoldan suhbat nomini avtomatik yaratish. */
export function autoTitle(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '');
  if (!clean) return 'Yangi suhbat';
  const short = clean.length > 48 ? `${clean.slice(0, 48).replace(/\s+\S*$/, '')}…` : clean;
  return short.charAt(0).toUpperCase() + short.slice(1);
}
