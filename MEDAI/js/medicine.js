/**
 * Dori qo'llanmasi (Medicine Guide): dori nomi, yo'riqnoma fayli yoki matni bo'yicha tushuntirish.
 * MEDAI dozani, davolash kursini yoki dorini almashtirishni tavsiya qilmaydi.
 */
import { $, $$, el, icon, icons, formatBytes } from './utils.js';
import { api } from './api.js';
import { toast, errorState, skeleton } from './ui.js';
import { bindDropzone, validateFile } from './dropzone.js';

const ALLOWED = ['pdf', 'txt', 'jpg', 'jpeg', 'png'];
const MAX_TEXT = 30000;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}\s\-+.,()'ʻʼ’]{1,79}$/u;

const SECTIONS = [
  ['name', 'Dori nomi', 'pill'],
  ['activeSubstance', 'Faol modda', 'flask-conical'],
  ['indications', 'Qoʻllanish sohasi', 'target'],
  ['contraindications', 'Qarshi koʻrsatmalar', 'ban'],
  ['sideEffects', 'Ehtimoliy nojoʻya taʼsirlar', 'triangle-alert'],
  ['interactions', 'Oʻzaro taʼsirlar', 'git-compare'],
  ['storage', 'Saqlash shartlari', 'thermometer'],
];

let file = null;
let controller = null;
let lastRequest = null;

export function initMedicine() {
  // Tablar (klaviatura: chap/o'ng strelka)
  const tabs = $$('#medicineTabs [role="tab"]');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab.id));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next.id);
      next.focus();
    });
  });

  $('#medNameForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#medNameInput');
    const name = input.value.trim();
    const err = !name ? 'Dori nomini kiriting.' : !NAME_RE.test(name) ? 'Dori nomi 2–80 belgidan iborat boʻlishi va faqat harf, raqam hamda oddiy belgilardan iborat boʻlishi kerak.' : '';
    setFieldError(input, $('#medNameError'), err);
    if (!err) run({ name });
  });
  $('#medNameInput').addEventListener('input', (e) => setFieldError(e.target, $('#medNameError'), ''));

  bindDropzone($('#medDropzone'), $('#medFileInput'), {
    onFile: (f, error) => (error ? toast(error, 'error') : setFile(f)),
    isDisabled: () => Boolean(controller),
  });
  $('#medRemoveBtn').addEventListener('click', clearFile);
  $('#medFileBtn').addEventListener('click', () => { if (file) run({ file }); });

  const ta = $('#medTextInput');
  ta.addEventListener('input', () => {
    $('#medTextCount').textContent = `${ta.value.length} / ${MAX_TEXT}`;
    setFieldError(ta, $('#medTextError'), '');
  });
  $('#medTextForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    const err = text.length < 50 ? 'Yoʻriqnoma matni kamida 50 belgidan iborat boʻlishi kerak.' : text.length > MAX_TEXT ? `Matn ${MAX_TEXT} belgidan oshmasligi kerak.` : '';
    setFieldError(ta, $('#medTextError'), err);
    if (!err) run({ text });
  });

  $('#medicineResult').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto-tab]');
    if (btn) { selectTab(btn.dataset.gotoTab); $(`#${btn.dataset.gotoTab}`).focus(); }
  });
}

function selectTab(id) {
  $$('#medicineTabs [role="tab"]').forEach((t) => {
    const on = t.id === id;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
  });
}

function setFieldError(input, box, msg) {
  box.textContent = msg;
  box.hidden = !msg;
  input.classList.toggle('is-invalid', Boolean(msg));
  if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

function setFile(f) {
  const check = validateFile(f, ALLOWED);
  if (!check.ok) { toast(check.error, 'error'); return; }
  file = f;
  $('#medFileName').textContent = f.name;
  $('#medFileMeta').textContent = `${check.label} · ${formatBytes(f.size)}`;
  $('#medFileChip').hidden = false;
  $('#medDropzone').hidden = true;
  $('#medFileBtn').disabled = false;
}

function clearFile() {
  file = null;
  $('#medFileChip').hidden = true;
  $('#medDropzone').hidden = false;
  $('#medFileBtn').disabled = true;
}

function setLoading(on) {
  $$('#view-medicine button[type="submit"], #medFileBtn').forEach((b) => { b.disabled = on || (b.id === 'medFileBtn' && !file); });
  $('#medicineResult').setAttribute('aria-busy', String(on));
}

async function run(payload) {
  if (controller) return; // takroriy so'rovni bloklash
  lastRequest = payload;
  controller = new AbortController();
  setLoading(true);
  const box = $('#medicineResult');
  box.replaceChildren(el('div', { class: 'card' }, [
    el('div', { class: 'loading-row', role: 'status' }, [el('span', { class: 'spinner' }), 'Yoʻriqnoma tahlil qilinmoqda…']),
    skeleton(3), skeleton(2), skeleton(3),
  ]));
  try {
    const data = await api.explainMedicine(payload, controller.signal);
    renderResult(data);
  } catch (err) {
    box.replaceChildren(errorState({ title: 'Natija olinmadi', text: err.message, onRetry: () => lastRequest && run(lastRequest) }));
    icons(box);
  } finally {
    controller = null;
    setLoading(false);
  }
  box.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function renderResult(d) {
  const box = $('#medicineResult');
  if (d.unavailable) {
    box.replaceChildren(el('div', { class: 'state-card state-card--warning' }, [
      el('div', { class: 'state-card__icon' }, [icon('cloud-off')]),
      el('div', { class: 'state-card__body' }, [
        el('h3', { text: 'Bu funksiya hozir mavjud emas' }),
        el('p', { text: d.notice }),
        el('div', { class: 'btn-row' }, [
          el('button', { type: 'button', class: 'btn btn--secondary btn--sm', dataset: { gotoTab: 'tab-file' } }, [icon('file-up'), 'Yoʻriqnoma faylini yuklash']),
          el('button', { type: 'button', class: 'btn btn--secondary btn--sm', dataset: { gotoTab: 'tab-text' } }, [icon('clipboard-list'), 'Matnni joylashtirish']),
        ]),
      ]),
    ]));
    icons(box);
    return;
  }

  const m = d.medicine || {};
  const found = SECTIONS.filter(([k]) => m[k]).length;
  box.replaceChildren(...[
    el('div', { class: 'card result-head' }, [
      el('div', { class: 'card__head' }, [
        el('div', {}, [
          el('p', { class: 'eyebrow', text: 'Dori yoʻriqnomasi' }),
          el('h2', { class: 'card__title card__title--lg', text: m.name || 'Nomi aniqlanmadi' }),
          el('p', { class: 'muted', text: `${found} ta boʻlim aniqlandi` }),
        ]),
        d.mode === 'ai'
          ? el('span', { class: 'mode-badge mode-badge--ai' }, [icon('sparkles'), 'AI tushuntirishi'])
          : el('span', { class: 'mode-badge mode-badge--demo' }, [icon('cloud-off'), 'DEMO · matn sarlavhalar boʻyicha ajratildi']),
      ]),
      el('div', { class: 'notice notice--danger' }, [icon('shield-alert'), el('p', { text: d.safetyNote })]),
      d.notice ? el('div', { class: 'notice notice--warning' }, [icon('triangle-alert'), el('p', { text: d.notice })]) : null,
    ]),
    el('div', { class: 'med-grid' }, SECTIONS.slice(1).map(([key, label, ic]) =>
      el('section', { class: `card med-section${m[key] ? '' : ' med-section--empty'}` }, [
        el('h3', { class: 'section-title' }, [icon(ic), label]),
        m[key]
          ? el('div', { class: 'med-section__text' }, m[key].split('\n').filter(Boolean).map((p) => el('p', { text: p })))
          : el('p', { class: 'muted', text: 'Hujjatda topilmadi.' }),
      ]))),
    d.dosageOmitted ? el('div', { class: 'notice notice--info' }, [icon('info'), el('p', { text: 'Yoʻriqnomadagi dozalash boʻlimi ataylab koʻrsatilmadi. Dozani shifokor yoki farmatsevt bilan aniqlang.' })]) : null,
    el('div', { class: 'card card--muted' }, [
      el('h3', { class: 'section-title' }, [icon('file-text'), 'Manba va hujjat sanasi']),
      el('p', { text: m.sourceNote || 'Manba koʻrsatilmagan.' }),
      el('p', { class: 'muted small', text: m.documentDate ? `Hujjat sanasi: ${m.documentDate}` : 'Hujjat sanasi aniqlanmadi.' }),
    ]),
  ].filter(Boolean));
  icons(box);
}
