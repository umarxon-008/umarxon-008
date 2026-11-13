/**
 * Qayta ishlatiladigan drag-and-drop fayl tanlash komponenti.
 * Fayl turi va hajmi brauzerda ham tekshiriladi (server ham qayta tekshiradi).
 */
import { formatBytes } from './utils.js';

// Chegara serverdan (/api/status -> limits.maxFileMb) olinadi: oddiy serverda 10 MB, Netlify'da 4 MB.
let maxFileMb = 10;
export function setMaxFileMb(mb) {
  if (Number.isFinite(mb) && mb > 0) maxFileMb = mb;
  document.querySelectorAll('[data-max-file]').forEach((n) => { n.textContent = String(maxFileMb); });
}

const TYPES = {
  pdf: { mime: ['application/pdf'], label: 'PDF' },
  jpg: { mime: ['image/jpeg'], label: 'JPG' },
  jpeg: { mime: ['image/jpeg'], label: 'JPEG' },
  png: { mime: ['image/png'], label: 'PNG' },
  txt: { mime: ['text/plain', ''], label: 'TXT' },
};

/** Faylni tekshiradi. Natija: { ok, error, ext, label } */
export function validateFile(file, allowedExt) {
  if (!file) return { ok: false, error: 'Fayl tanlanmadi.' };
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  const type = TYPES[ext];
  if (!type || !allowedExt.includes(ext)) {
    return { ok: false, error: `«${file.name}» formati qoʻllab-quvvatlanmaydi. Ruxsat etilgan formatlar: ${allowedExt.map((e) => e.toUpperCase()).join(', ')}.` };
  }
  if (file.type && !type.mime.includes(file.type)) {
    return { ok: false, error: 'Fayl turi uning kengaytmasiga mos kelmaydi. Boshqa fayl tanlang.' };
  }
  if (file.size === 0) return { ok: false, error: 'Fayl boʻsh.' };
  if (file.size > maxFileMb * 1024 * 1024) {
    return { ok: false, error: `Fayl hajmi juda katta (${formatBytes(file.size)}). Maksimal hajm — ${maxFileMb} MB.` };
  }
  return { ok: true, ext, label: type.label };
}

/**
 * Dropzone elementini faollashtiradi.
 * onFile(file) — tanlangan fayl bilan chaqiriladi; isDisabled() true bo'lsa tanlash bloklanadi.
 */
export function bindDropzone(zone, input, { onFile, isDisabled = () => false }) {
  const pick = () => { if (!isDisabled()) input.click(); };
  zone.addEventListener('click', (e) => { if (e.target !== input) pick(); });
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
  });
  input.addEventListener('change', () => {
    if (input.files?.[0]) onFile(input.files[0]);
    input.value = '';
  });
  let depth = 0;
  zone.addEventListener('dragenter', (e) => { e.preventDefault(); if (!isDisabled()) { depth += 1; zone.classList.add('is-dragover'); } });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = isDisabled() ? 'none' : 'copy'; });
  zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('is-dragover'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    zone.classList.remove('is-dragover');
    if (isDisabled()) return;
    const files = e.dataTransfer?.files;
    if (files?.length > 1) { onFile(null, 'Bir vaqtda faqat bitta fayl yuklash mumkin.'); return; }
    if (files?.[0]) onFile(files[0]);
  });
}
