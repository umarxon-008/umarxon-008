/**
 * Tibbiy tahlil (Medical Analysis): laboratoriya hujjatini yuklash va tushuntirish.
 * Oqim: 1) yuklash  ->  2) aniqlangan qiymatlarni foydalanuvchi tasdiqlaydi  ->  3) natija.
 * MAXFIYLIK: fayl va natijalar faqat sahifa xotirasida turadi — localStorage ga yozilmaydi.
 */
import { $, el, icon, icons, formatBytes, renderMarkdown, copyText } from './utils.js';
import { api } from './api.js';
import { toast } from './ui.js';
import { bindDropzone, validateFile } from './dropzone.js';
import { parseRange, compare, toNumber, isMarkedDeviation, markerPosition, STATUS } from './lab.js';
import { loadLibrary, matchTerm, openTerm } from './library.js';

const ALLOWED = ['pdf', 'jpg', 'jpeg', 'png'];
const GENERIC_QUESTIONS = [
  'Natijalarim yoshim, jinsim va sogʻligʻim holatini hisobga olganda qanday baholanadi?',
  'Qaysi koʻrsatkichlarni qayta tekshirish kerak va qachon?',
  'Tahlil oldidan tayyorgarlik yoki qabul qilayotgan dorilarim natijaga taʼsir qilganmi?',
];

const s = {
  file: null,
  previewUrl: null,
  controller: null,
  response: null, // serverdan kelgan javob
  rows: [], // tasdiqlash jadvali
};

export function initAnalysis() {
  bindDropzone($('#labDropzone'), $('#labFileInput'), {
    onFile: (file, error) => (error ? showError(error) : setFile(file)),
    isDisabled: () => Boolean(s.controller),
  });
  $('#labRemoveBtn').addEventListener('click', clearFile);
  $('#labAnalyzeBtn').addEventListener('click', analyze);
  $('#labCancelBtn').addEventListener('click', () => s.controller?.abort());
  $('#labManualBtn').addEventListener('click', () => goConfirm({ mode: 'manual', items: [], testName: '' }));
  $('#labSampleBtn').addEventListener('click', loadSample);
  $('#analysisStage2').addEventListener('click', onConfirmClick);
  $('#analysisStage2').addEventListener('input', onConfirmInput);
  $('#analysisStage3').addEventListener('click', onResultClick);
}

/** Chat orqali biriktirilgan faylni qabul qilish. */
export function acceptExternalFile(file) {
  setStage(1);
  setFile(file);
}

function setStage(n) {
  [1, 2, 3].forEach((i) => { $(`#analysisStage${i}`).hidden = i !== n; });
  document.querySelectorAll('#analysisStepper li').forEach((li) => {
    const step = Number(li.dataset.step);
    li.classList.toggle('is-active', step === n);
    li.classList.toggle('is-done', step < n);
    if (step === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('#main').scrollTo?.({ top: 0 });
}

function showError(msg) {
  const box = $('#labError');
  box.textContent = msg;
  box.hidden = !msg;
}

function setFile(file) {
  showError('');
  const check = validateFile(file, ALLOWED);
  if (!check.ok) {
    showError(check.error);
    toast(check.error, 'error');
    return;
  }
  clearFile(false);
  s.file = file;
  $('#labFileName').textContent = file.name;
  $('#labFileMeta').textContent = `${check.label} · ${formatBytes(file.size)}`;
  const thumb = $('#labFileThumb');
  thumb.replaceChildren();
  if (file.type.startsWith('image/')) {
    s.previewUrl = URL.createObjectURL(file);
    thumb.append(el('img', { src: s.previewUrl, alt: 'Yuklangan rasm koʻrinishi' }));
  } else {
    thumb.append(icon('file-text'));
    icons(thumb);
  }
  $('#labFileChip').hidden = false;
  $('#labDropzone').hidden = true;
  $('#labAnalyzeBtn').disabled = false;
  $('#labAnalyzeBtn').focus();
}

function clearFile(focus = true) {
  if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
  s.file = null;
  s.previewUrl = null;
  $('#labFileChip').hidden = true;
  $('#labDropzone').hidden = false;
  $('#labAnalyzeBtn').disabled = true;
  if (focus === true) $('#labDropzone').focus();
}

function setProcessing(on) {
  $('#labProgress').hidden = !on;
  $('#labFileChip').classList.toggle('is-processing', on);
  $('#labAnalyzeBtn').disabled = on || !s.file;
  $('#labRemoveBtn').disabled = on;
  $('#labManualBtn').disabled = on;
  $('#labSampleBtn').disabled = on;
}

async function analyze() {
  if (!s.file || s.controller) return; // takroriy so'rovni bloklash
  showError('');
  s.controller = new AbortController();
  setProcessing(true);
  const steps = [...document.querySelectorAll('#labProgress [data-step]')];
  let i = 0;
  steps.forEach((st) => st.classList.remove('is-active', 'is-done'));
  steps[0]?.classList.add('is-active');
  const ticker = setInterval(() => {
    if (i < steps.length - 1) {
      steps[i].classList.replace('is-active', 'is-done');
      i += 1;
      steps[i].classList.add('is-active');
    }
  }, 900);

  try {
    const data = await api.analyzeReport(s.file, s.controller.signal);
    await loadLibrary().catch(() => null);
    goConfirm(data);
    if (data.notice) toast(data.notice, data.items?.length ? 'info' : 'warning', { timeout: 7000 });
  } catch (err) {
    if (err.kind === 'aborted') toast('Yuklash bekor qilindi.', 'info');
    else { showError(err.message); toast(err.message, 'error'); }
  } finally {
    clearInterval(ticker);
    s.controller = null;
    setProcessing(false);
  }
}

async function loadSample() {
  try {
    const res = await fetch('/assets/samples/namuna-qon-tahlili.pdf');
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    setFile(new File([blob], 'namuna-qon-tahlili.pdf', { type: 'application/pdf' }));
    toast('Namuna hujjat yuklandi. Bu soxta (sintetik) maʼlumot — haqiqiy bemorga tegishli emas.', 'info', { timeout: 6000 });
  } catch {
    toast('Namuna faylni yuklab boʻlmadi.', 'error');
  }
}

/* ---------------- 2-bosqich: tasdiqlash ---------------- */

function goConfirm(data) {
  s.response = data;
  s.rows = (data.items || []).map((i) => ({ name: i.name || '', value: i.value || '', unit: i.unit || '', range: i.referenceRange || '' }));
  if (!s.rows.length) s.rows.push({ name: '', value: '', unit: '', range: '' });
  renderConfirm();
  setStage(2);
}

function renderConfirm() {
  const d = s.response;
  const stage = $('#analysisStage2');
  const manual = d.mode === 'manual';
  const intro = manual
    ? el('div', { class: 'notice notice--info' }, [icon('pencil'), el('p', { text: 'Koʻrsatkichlarni hujjatingizdagidek kiriting: nomi, natija, birlik va hujjatda yozilgan meʼyoriy oraliq (reference range). Oraliq yozilmagan boʻlsa — boʻsh qoldiring.' })])
    : el('div', { class: 'notice notice--warning' }, [icon('triangle-alert'), el('p', {}, [
      el('strong', { text: 'Qiymatlarni tekshiring. ' }),
      d.mode === 'ai' ? 'Hujjat AI tomonidan oʻqildi' : 'Qiymatlar matndan avtomatik ajratildi',
      ' — xato boʻlishi mumkin. Har bir qatorni asl hujjat bilan solishtiring va kerak boʻlsa tuzating.',
    ])]);

  const extra = [];
  if (d.ocrUnavailable) extra.push(el('div', { class: 'notice notice--info' }, [icon('info'), el('p', { text: d.notice })]));

  stage.replaceChildren(...[
    el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [
        el('div', {}, [
          el('h2', { class: 'card__title', text: '2. Aniqlangan qiymatlarni tasdiqlang' }),
          el('p', { class: 'muted', text: d.testName ? `Hujjat: ${d.testName}` : manual ? 'Qoʻlda kiritish' : 'Tahlil nomi aniqlanmadi' }),
        ]),
        modeTag(d.mode),
      ]),
      intro,
      ...extra,
      el('form', { class: 'confirm-form', id: 'confirmForm', novalidate: true }, [
        el('div', { class: 'table-wrap' }, [
          el('table', { class: 'data-table data-table--edit' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { scope: 'col', text: 'Koʻrsatkich' }),
              el('th', { scope: 'col', text: 'Natija' }),
              el('th', { scope: 'col', text: 'Birlik' }),
              el('th', { scope: 'col', text: 'Meʼyoriy oraliq (hujjatda)' }),
              el('th', { scope: 'col' }, [el('span', { class: 'sr-only', text: 'Amallar' })]),
            ])]),
            el('tbody', { id: 'confirmRows' }, s.rows.map(rowEl)),
          ]),
        ]),
        el('p', { class: 'form-error', id: 'confirmError', role: 'alert', hidden: true }),
        el('div', { class: 'form-actions' }, [
          el('button', { type: 'button', class: 'btn btn--ghost', dataset: { action: 'add-row' } }, [icon('plus'), 'Qator qoʻshish']),
          el('span', { class: 'spacer' }),
          el('button', { type: 'button', class: 'btn btn--secondary', dataset: { action: 'back' } }, [icon('arrow-left'), 'Orqaga']),
          el('button', { type: 'submit', class: 'btn btn--primary' }, [icon('check'), 'Tasdiqlash va natijani koʻrish']),
        ]),
      ]),
    ]),
  ].filter(Boolean));
  $('#confirmForm').addEventListener('submit', (e) => { e.preventDefault(); submitConfirm(); });
  icons(stage);
}

function rowEl(r, idx) {
  const field = (key, label, placeholder, attrs = {}) => el('td', { 'data-label': label }, [
    el('input', { class: 'input input--sm', value: r[key], 'aria-label': `${label}, ${idx + 1}-qator`, placeholder, dataset: { row: idx, key }, maxlength: key === 'name' ? 80 : 40, ...attrs }),
  ]);
  return el('tr', { dataset: { row: idx } }, [
    field('name', 'Koʻrsatkich', 'Masalan: Gemoglobin'),
    field('value', 'Natija', '135', { inputmode: 'decimal' }),
    field('unit', 'Birlik', 'g/L'),
    field('range', 'Meʼyoriy oraliq', '120 - 160'),
    el('td', { class: 'cell-actions' }, [
      el('button', { type: 'button', class: 'icon-btn icon-btn--sm', dataset: { action: 'del-row', row: idx, tooltip: 'Qatorni oʻchirish' }, 'aria-label': `${idx + 1}-qatorni oʻchirish` }, [icon('trash-2')]),
    ]),
  ]);
}

function onConfirmInput(e) {
  const input = e.target.closest('input[data-row]');
  if (!input) return;
  s.rows[Number(input.dataset.row)][input.dataset.key] = input.value;
  input.classList.remove('is-invalid');
}

function onConfirmClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'add-row') {
    if (s.rows.length >= 60) { toast('Koʻpi bilan 60 ta koʻrsatkich kiritish mumkin.', 'warning'); return; }
    s.rows.push({ name: '', value: '', unit: '', range: '' });
    rerenderRows();
    $(`#confirmRows tr:last-child input`).focus();
  } else if (action === 'del-row') {
    s.rows.splice(Number(btn.dataset.row), 1);
    if (!s.rows.length) s.rows.push({ name: '', value: '', unit: '', range: '' });
    rerenderRows();
  } else if (action === 'back') {
    setStage(1);
  }
}

function rerenderRows() {
  const body = $('#confirmRows');
  body.replaceChildren(...s.rows.map(rowEl));
  icons(body);
}

function submitConfirm() {
  const errBox = $('#confirmError');
  const rows = s.rows.map((r) => ({ ...r, name: r.name.trim(), value: r.value.trim(), unit: r.unit.trim(), range: r.range.trim() }))
    .filter((r) => r.name || r.value || r.unit || r.range);
  let firstInvalid = null;
  const markInvalid = (idx, key) => {
    const input = $(`#confirmRows input[data-row="${idx}"][data-key="${key}"]`);
    input?.classList.add('is-invalid');
    input?.setAttribute('aria-invalid', 'true');
    firstInvalid = firstInvalid || input;
  };
  const problems = [];
  s.rows.forEach((r, idx) => {
    if (!(r.name.trim() || r.value.trim() || r.unit.trim() || r.range.trim())) return;
    if (!r.name.trim()) { markInvalid(idx, 'name'); problems.push(`${idx + 1}-qator: koʻrsatkich nomi kiritilmagan.`); }
    if (toNumber(r.value) === null) { markInvalid(idx, 'value'); problems.push(`${idx + 1}-qator: natija son boʻlishi kerak.`); }
    if (r.range.trim() && !parseRange(r.range)) { markInvalid(idx, 'range'); problems.push(`${idx + 1}-qator: oraliq formati tushunarsiz (masalan: 120 - 160, < 5, > 30).`); }
  });
  if (!rows.length) problems.push('Kamida bitta koʻrsatkich kiriting.');
  if (problems.length) {
    errBox.textContent = problems.slice(0, 3).join(' ');
    errBox.hidden = false;
    firstInvalid?.focus();
    return;
  }
  errBox.hidden = true;
  renderResult(rows);
  setStage(3);
}

/* ---------------- 3-bosqich: natija ---------------- */

function renderResult(rows) {
  const d = s.response;
  const items = rows.map((r) => {
    const value = toNumber(r.value);
    const range = parseRange(r.range);
    const status = compare(value, range);
    return { ...r, value, valueText: r.value, rangeObj: range, status, marked: isMarkedDeviation(value, range), term: matchTerm(r.name) };
  });
  const counts = { normal: 0, low: 0, high: 0, unknown: 0 };
  items.forEach((i) => { counts[i.status] += 1; });
  const urgent = items.some((i) => i.marked) || Boolean(d.urgentNote);

  const questions = d.doctorQuestions?.length
    ? d.doctorQuestions
    : [...new Set([
      ...items.filter((i) => i.status === 'low' || i.status === 'high').flatMap((i) => i.term?.doctorQuestions?.slice(0, 1) || []),
      ...GENERIC_QUESTIONS,
    ])].slice(0, 6);

  const stage = $('#analysisStage3');
  stage.replaceChildren(...[
    el('div', { class: 'card result-head' }, [
      el('div', { class: 'card__head' }, [
        el('div', {}, [
          el('p', { class: 'eyebrow', text: 'Tahlil natijasi' }),
          el('h2', { class: 'card__title card__title--lg', text: d.testName || 'Laboratoriya tahlili' }),
          el('p', { class: 'muted', text: 'Natijalar faqat hujjatda berilgan meʼyoriy oraliq bilan solishtirildi.' }),
        ]),
        modeTag(d.mode),
      ]),
      el('div', { class: 'stat-row' }, [
        stat('Oraliq ichida', counts.normal, 'success', 'check'),
        stat('Oraliqdan past', counts.low, 'warning', 'arrow-down'),
        stat('Oraliqdan yuqori', counts.high, 'warning', 'arrow-up'),
        stat('Baholanmadi', counts.unknown, 'muted', 'circle-help'),
      ]),
    ]),
    urgent ? el('div', { class: 'notice notice--danger', role: 'alert' }, [icon('siren'), el('p', {}, [
      el('strong', { text: 'Diqqat. ' }),
      d.urgentNote || 'Baʼzi natijalar hujjatdagi oraliqdan sezilarli farq qiladi. Bu tashxis emas, lekin natijani imkon qadar tezroq shifokoringiz bilan muhokama qiling.',
      ' Agar oʻzingizni yomon his qilsangiz (kuchli holsizlik, nafas qisilishi, koʻkrak ogʻrigʻi, hushdan ketish) — darhol 103 ga qoʻngʻiroq qiling.',
    ])]) : null,
    d.explanation ? el('div', { class: 'card' }, [
      el('h3', { class: 'section-title' }, [icon('sparkles'), 'Umumiy izoh (AI)']),
      el('div', { class: 'md', html: renderMarkdown(d.explanation) }),
      el('p', { class: 'muted small', text: d.sourceNote || 'Rasmiy manba bilan tasdiqlanmagan.' }),
    ]) : null,
    el('div', { class: 'result-list' }, items.map(resultCard)),
    el('div', { class: 'grid-2' }, [
      el('div', { class: 'card' }, [
        el('h3', { class: 'section-title' }, [icon('triangle-alert'), 'Maʼlumotning cheklovlari']),
        el('ul', { class: 'check-list check-list--warning' }, (d.limitations?.length ? d.limitations : [
          'Qiymatlar qoʻlda kiritildi — ularning toʻgʻriligi uchun hujjatni qayta tekshiring.',
          'Reference range laboratoriya, yosh, jins va boshqa omillarga qarab farq qiladi.',
          'Bu talqin tashxis emas va shifokor xulosasi oʻrnini bosmaydi.',
        ]).map((t) => el('li', { text: t }))),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'section-title-row' }, [
          el('h3', { class: 'section-title' }, [icon('clipboard-list'), 'Shifokorga berish mumkin boʻlgan savollar']),
          el('button', { type: 'button', class: 'icon-btn icon-btn--sm', dataset: { action: 'copy-questions', tooltip: 'Savollarni nusxalash' }, 'aria-label': 'Savollarni nusxalash' }, [icon('copy')]),
        ]),
        el('ol', { class: 'question-list', id: 'doctorQuestions' }, questions.map((q) => el('li', { text: q }))),
      ]),
    ]),
    el('div', { class: 'card card--muted privacy-line' }, [
      icon('lock'),
      el('p', { text: 'Yuklangan fayl serverda saqlanmaydi va bu natijalar qurilmangizda ham saqlanmaydi — sahifani yangilasangiz oʻchadi.' }),
    ]),
    el('div', { class: 'form-actions' }, [
      el('button', { type: 'button', class: 'btn btn--secondary', dataset: { action: 'edit' } }, [icon('pencil'), 'Qiymatlarni tahrirlash']),
      el('span', { class: 'spacer' }),
      el('button', { type: 'button', class: 'btn btn--primary', dataset: { action: 'new' } }, [icon('file-up'), 'Yangi tahlil']),
    ]),
  ].filter(Boolean));
  icons(stage);
}

function resultCard(i) {
  const st = STATUS[i.status];
  const pos = markerPosition(i.value, i.rangeObj);
  let scale = null;
  if (pos !== null) {
    const marker = el('span', { class: `range-bar__marker range-bar__marker--${i.status}` });
    marker.style.left = `${pos}%`;
    scale = el('div', { class: 'range-bar', 'aria-hidden': 'true' }, [
      el('span', { class: 'range-bar__zone' }),
      marker,
      el('span', { class: 'range-bar__label range-bar__label--low', text: String(i.rangeObj.low) }),
      el('span', { class: 'range-bar__label range-bar__label--high', text: String(i.rangeObj.high) }),
    ]);
  }
  const meaning = i.term
    ? el('div', { class: 'result-card__meaning' }, [
      el('p', {}, [el('strong', { text: 'Umumiy maʼnosi: ' }), i.term.simple]),
      el('button', { type: 'button', class: 'link-btn', dataset: { action: 'term', term: i.term.id } }, ['Kutubxonada batafsil', icon('arrow-right')]),
    ])
    : el('p', { class: 'result-card__meaning muted', text: 'MEDAI kutubxonasida bu koʻrsatkich haqida maʼlumot yoʻq.' });

  return el('article', { class: `card result-card result-card--${i.status}` }, [
    el('div', { class: 'result-card__top' }, [
      el('div', {}, [
        el('h3', { class: 'result-card__name', text: i.name }),
        el('p', { class: 'result-card__range', text: i.range ? `Hujjatdagi oraliq: ${i.range}${i.unit ? ` ${i.unit}` : ''}` : 'Hujjatda meʼyoriy oraliq koʻrsatilmagan' }),
      ]),
      el('div', { class: 'result-card__value' }, [
        el('strong', { text: i.valueText }),
        el('span', { text: i.unit || 'birlik koʻrsatilmagan' }),
      ]),
    ]),
    el('span', { class: `status-badge status-badge--${st.tone}` }, [icon(st.icon), st.label]),
    scale,
    i.status === 'unknown' ? el('p', { class: 'muted small', text: 'Oraliq hujjatda boʻlmagani uchun natija baholanmadi — MEDAI oraliqni oʻzidan qoʻymaydi.' }) : null,
    meaning,
  ]);
}

function stat(label, value, tone, iconName) {
  return el('div', { class: `stat stat--${tone}` }, [
    el('span', { class: 'stat__icon' }, [icon(iconName)]),
    el('div', {}, [el('strong', { text: String(value) }), el('span', { text: label })]),
  ]);
}

function modeTag(mode) {
  if (mode === 'ai') return el('span', { class: 'mode-badge mode-badge--ai' }, [icon('sparkles'), 'AI tahlili']);
  if (mode === 'manual') return el('span', { class: 'mode-badge mode-badge--muted' }, [icon('pencil'), 'Qoʻlda kiritilgan']);
  return el('span', { class: 'mode-badge mode-badge--demo' }, [icon('cloud-off'), 'DEMO · qoidaga asoslangan (AI emas)']);
}

async function onResultClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'term') openTerm(btn.dataset.term);
  else if (action === 'edit') setStage(2);
  else if (action === 'new') {
    s.response = null;
    s.rows = [];
    clearFile();
    setStage(1);
  } else if (action === 'copy-questions') {
    const text = [...document.querySelectorAll('#doctorQuestions li')].map((li, i) => `${i + 1}. ${li.textContent}`).join('\n');
    const ok = await copyText(text);
    toast(ok ? 'Savollar nusxalandi.' : 'Nusxalab boʻlmadi.', ok ? 'success' : 'error');
  }
}

