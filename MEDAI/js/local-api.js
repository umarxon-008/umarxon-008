/**
 * BRAUZERDAGI DEMO DVIGATEL — server bo'lmaganda (statik hosting: Netlify Drop, GitHub Pages va h.k.).
 * Server bilan bir xil javob formatini qaytaradi va bir xil umumiy mantiqdan (shared/) foydalanadi.
 * Hech qanday ma'lumot tashqariga yuborilmaydi: fayllar faqat shu brauzerda o'qiladi.
 * Bu rejim ham AI EMAS — qoidaga asoslangan demo.
 */
import { ApiError } from './api.js';
import { prepareLibrary } from '../shared/library.js';
import { demoReply } from '../shared/demo.js';
import { demoAnalysis, demoAnalysisImage, demoLeaflet, demoMedicineUnavailable, NOTICES, MAX_LEAFLET_CHARS } from '../shared/reports.js';

const MAX_CHARS = 4000;
const MAX_FILE_MB = 10;
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}\s\-+.,()'ʻʼ’]{1,79}$/u;

let libPromise = null;
const getLib = () => {
  // file:// da fetch ishlamaydi — yig'ilgan versiyada ma'lumot sahifaga oldindan joylanadi (window.MEDAI_TERMS)
  if (!libPromise && window.MEDAI_TERMS) libPromise = Promise.resolve(prepareLibrary(window.MEDAI_TERMS));
  if (!libPromise) {
    libPromise = fetch('data/medical-terms.json')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(prepareLibrary)
      .catch(() => { libPromise = null; throw new ApiError('Kutubxona maʼlumotlarini yuklab boʻlmadi.', { kind: 'library' }); });
  }
  return libPromise;
};

/** Javob "o'ylanayotgandek" tabiiy ko'rinishi uchun qisqa kechikish (bekor qilish mumkin). */
function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new ApiError('Soʻrov bekor qilindi.', { kind: 'aborted' })); }, { once: true });
  });
}

/* ---------------- Fayl tekshiruvi (server bilan bir xil qoidalar) ---------------- */
const EXT = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };

async function detectType(file, allowed) {
  if (!file || file.size === 0) throw new ApiError('Fayl tanlanmagan yoki boʻsh.', { status: 400 });
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new ApiError(`Fayl hajmi ${MAX_FILE_MB} MB dan oshmasligi kerak.`, { status: 413 });
  const type = EXT[String(file.name).split('.').pop().toLowerCase()];
  if (!type || !allowed.includes(type)) throw new ApiError('Bu fayl formati qoʻllab-quvvatlanmaydi.', { status: 415 });
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const ok = {
    'application/pdf': () => String.fromCharCode(...b.slice(0, 5)) === '%PDF-',
    'image/png': () => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
    'image/jpeg': () => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'text/plain': () => true,
  }[type]();
  if (!ok) throw new ApiError('Fayl mazmuni uning formatiga mos kelmaydi. Fayl buzilgan boʻlishi mumkin.', { status: 415 });
  return type;
}

const formatOf = (type) => ({ 'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG', 'text/plain': 'TXT' }[type]);

/** Oddiy (klassik) skriptni yuklash — file:// da ham ishlaydi (modul va Worker'dan farqli). */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

let pdfjsPromise = null;
/**
 * pdf.js (v3, UMD) ni yuklaydi. Worker fayli ham oddiy skript sifatida yuklanadi (window.pdfjsWorker),
 * shunda pdf.js alohida Worker yaratmasdan asosiy oqimda ishlaydi — file:// da ham.
 * Xavfsizlik: isEvalSupported: false (CVE-2024-4367 dan himoya).
 */
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      if (!window.pdfjsLib) await loadScript('vendor/pdfjs/pdf.min.js');
      if (!window.pdfjsWorker) await loadScript('vendor/pdfjs/pdf.worker.min.js');
      return window.pdfjsLib;
    })().catch(() => { pdfjsPromise = null; throw new ApiError('PDF oʻquvchi modulni yuklab boʻlmadi.', { kind: 'pdfjs' }); });
  }
  return pdfjsPromise;
}

/** PDF matnini brauzerda ajratish (pdf.js). Matn qatorlari y-koordinata bo'yicha tiklanadi. */
async function pdfText(file) {
  const pdfjs = await getPdfjs();
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 30); p += 1) {
      const content = await (await doc.getPage(p)).getTextContent();
      const rows = new Map();
      for (const it of content.items) {
        if (!it.str?.trim()) continue;
        const y = Math.round(it.transform[5] / 2) * 2;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ x: it.transform[4], s: it.str });
      }
      [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
        lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim());
      });
    }
    return { text: lines.join('\n'), pages: doc.numPages };
  } catch {
    throw new ApiError('PDF faylni oʻqib boʻlmadi. Fayl buzilgan yoki parol bilan himoyalangan boʻlishi mumkin.', { status: 422 });
  }
}

/* ---------------- API (server bilan bir xil interfeys) ---------------- */
export const localApi = {
  async status() {
    await getLib();
    return { mode: 'demo', engine: 'browser', model: null, rag: { enabled: false, documents: 0 }, limits: { maxFileMb: MAX_FILE_MB, maxMessageChars: MAX_CHARS }, version: '0.2.0' };
  },

  async chat(messages, signal) {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
    if (!last) throw new ApiError('Xabar boʻsh boʻlmasligi kerak.', { status: 400 });
    if (last.length > MAX_CHARS) throw new ApiError(`Xabar ${MAX_CHARS} belgidan oshmasligi kerak.`, { status: 400 });
    const lib = await getLib();
    await pause(450 + Math.random() * 350, signal);
    const r = demoReply(last, lib);
    return {
      mode: 'demo', engine: 'browser', reply: r.reply, sources: r.sources, sourceNote: r.sourceNote, flags: r.flags, kind: r.kind,
      generatedAt: new Date().toISOString(), dataDate: r.sources.length ? lib.meta.updatedAt : null,
    };
  },

  async analyzeReport(file, signal) {
    const type = await detectType(file, ['application/pdf', 'image/png', 'image/jpeg']);
    const info = { format: formatOf(type), size: file.size };
    await pause(900, signal);
    if (type !== 'application/pdf') return demoAnalysisImage(info);
    const { text, pages } = await pdfText(file);
    return demoAnalysis(text, { ...info, pages });
  },

  async explainMedicine({ name, text, file }, signal) {
    await pause(500, signal);
    if (file) {
      const type = await detectType(file, ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']);
      if (type.startsWith('image/')) return demoMedicineUnavailable('document', NOTICES.medImage);
      const content = type === 'text/plain' ? await file.text() : (await pdfText(file)).text;
      return demoLeaflet(content);
    }
    if (text) {
      if (text.length < 50) throw new ApiError('Yoʻriqnoma matni juda qisqa (kamida 50 belgi).', { status: 400 });
      if (text.length > MAX_LEAFLET_CHARS) throw new ApiError(`Matn ${MAX_LEAFLET_CHARS} belgidan oshmasligi kerak.`, { status: 413 });
      return demoLeaflet(text);
    }
    if (!name || !NAME_RE.test(name)) throw new ApiError('Dori nomi 2–80 belgidan iborat boʻlishi va faqat harf, raqam hamda oddiy belgilardan tashkil topishi kerak.', { status: 400 });
    return demoMedicineUnavailable('name', NOTICES.medName);
  },
};
