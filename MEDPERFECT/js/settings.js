/** Profil va sozlamalar: ism, maxfiylik, interfeys, tizim holati, ma'lumotlarni o'chirish. */
import { $, icons } from './utils.js';
import { store } from './store.js';
import { toast, confirmDialog } from './ui.js';

const NAME_RE = /^[\p{L}\s'ʻʼ’-]{0,40}$/u;
let refreshStatus = () => {};

export function initSettings({ onRefreshStatus }) {
  refreshStatus = onRefreshStatus;
  $('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#profileName');
    const name = input.value.trim().replace(/\s+/g, ' ');
    const err = $('#profileNameError');
    if (!NAME_RE.test(name)) {
      err.textContent = 'Ism faqat harflardan iborat boʻlishi va 40 belgidan oshmasligi kerak.';
      err.hidden = false;
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    err.hidden = true;
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    store.updateSettings({ name });
    toast(name ? 'Ism saqlandi.' : 'Ism oʻchirildi.', 'success');
  });

  $('#saveHistoryToggle').addEventListener('change', async (e) => {
    if (!e.target.checked) {
      const ok = await confirmDialog({
        title: 'Tarixni saqlashni oʻchirish',
        message: 'Suhbatlar endi qurilmada saqlanmaydi va ilgari saqlangan tarix ham qurilmadan oʻchiriladi. Joriy suhbatlar sahifa yangilanguncha koʻrinib turadi.',
        confirmLabel: 'Oʻchirish',
        danger: true,
      });
      if (!ok) { e.target.checked = true; return; }
    }
    store.updateSettings({ saveHistory: e.target.checked });
    toast(e.target.checked ? 'Suhbatlar endi shu qurilmada saqlanadi.' : 'Tarixni saqlash oʻchirildi.', 'success');
  });

  $('#reduceMotionToggle').addEventListener('change', (e) => {
    store.updateSettings({ reduceMotion: e.target.checked });
    applyMotion();
  });

  $('#refreshStatusBtn').addEventListener('click', () => refreshStatus(true));

  $('#wipeDataBtn').addEventListener('click', wipeAll);
  applyMotion();
}

export async function wipeAll() {
  const ok = await confirmDialog({
    title: 'Barcha maʼlumotlarni oʻchirish',
    message: 'Ushbu qurilmadagi barcha suhbatlar, baholar va sozlamalar oʻchiriladi. Bu amalni qaytarib boʻlmaydi.',
    confirmLabel: 'Hammasini oʻchirish',
    danger: true,
  });
  if (!ok) return;
  store.wipe();
  syncSettingsForm();
  applyMotion();
  toast('Barcha mahalliy maʼlumotlar oʻchirildi.', 'success');
}

export function applyMotion() {
  document.documentElement.classList.toggle('reduce-motion', Boolean(store.settings.reduceMotion));
}

export function syncSettingsForm() {
  $('#profileName').value = store.settings.name || '';
  $('#saveHistoryToggle').checked = store.settings.saveHistory;
  $('#reduceMotionToggle').checked = Boolean(store.settings.reduceMotion);
}

export function renderSystemStatus(status) {
  const rows = {
    sysServer: status ? 'Ulangan' : 'Ulanmagan',
    sysMode: !status ? '—' : status.mode === 'ai' ? 'AI rejimi' : 'Demo rejim (AI ulanmagan)',
    sysModel: status?.model || 'Yoʻq',
    sysRag: status?.rag?.enabled ? `Ulangan (${status.rag.documents} hujjat)` : 'Ulanmagan',
  };
  for (const [id, text] of Object.entries(rows)) $(`#${id}`).textContent = text;
  icons($('#view-settings'));
}
