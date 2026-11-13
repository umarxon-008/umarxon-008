import { Router } from 'express';
import { isAiEnabled, config } from '../config.js';
import { uploadSingle } from './upload.js';
import { detectFileType, extractPdfText, FileError } from '../services/files.js';
import { parseLeaflet } from '../services/leafletParser.js';
import { aiExplainMedicine } from '../services/ai.js';
import { clip } from '../services/text.js';

const router = Router();
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N}\s\-+.,()'ʻʼ’]{1,79}$/u;
const SAFETY_NOTE = 'MEDAI dori dozasini, davolash kursini yoki boshqa doriga almashtirishni tavsiya qilmaydi. Dori sizga mosligini shifokor yoki farmatsevt aniqlaydi.';

const fromAi = (r) => ({
  name: clip(r.name, 120), activeSubstance: clip(r.active_substance, 2000), indications: clip(r.indications, 4000),
  contraindications: clip(r.contraindications, 4000), sideEffects: clip(r.side_effects, 4000),
  interactions: clip(r.interactions, 4000), storage: clip(r.storage, 1000), documentDate: clip(r.document_date, 40),
  sourceNote: clip(r.source_note, 600),
});

router.post('/explain-medicine', uploadSingle, async (req, res, next) => {
  try {
    const ai = isAiEnabled();
    const base = { mode: ai ? 'ai' : 'demo', model: ai ? config.model : null, safetyNote: SAFETY_NOTE };

    // 1) Fayl
    if (req.file) {
      const type = detectFileType(req.file, ALLOWED);
      let text = '';
      if (type === 'text/plain') text = req.file.buffer.toString('utf8');
      else if (type === 'application/pdf') text = (await extractPdfText(req.file.buffer)).text;

      if (ai) {
        const r = type === 'text/plain'
          ? await aiExplainMedicine({ text: clip(text, config.maxLeafletChars) })
          : await aiExplainMedicine({ file: { buffer: req.file.buffer, type } });
        return res.json({ ...base, source: 'document', medicine: fromAi(r), dosageOmitted: true });
      }
      if (type.startsWith('image/')) {
        return res.json({ ...base, source: 'document', unavailable: true,
          notice: 'Demo rejimda rasmdan matn oʻqish (OCR) mavjud emas. Yoʻriqnomaning PDF yoki matn (TXT) shaklini yuklang yoki matnni joylashtiring.' });
      }
      return respondLeaflet(res, base, text);
    }

    // 2) Joylashtirilgan matn
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (text) {
      if (text.length < 50) throw new FileError('Yoʻriqnoma matni juda qisqa (kamida 50 belgi).');
      if (text.length > config.maxLeafletChars) throw new FileError(`Matn ${config.maxLeafletChars} belgidan oshmasligi kerak.`, 413);
      if (ai) return res.json({ ...base, source: 'document', medicine: fromAi(await aiExplainMedicine({ text })), dosageOmitted: true });
      return respondLeaflet(res, base, text);
    }

    // 3) Dori nomi
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw new FileError('Dori nomini kiriting yoki yoʻriqnoma faylini yuklang.');
    if (!NAME_RE.test(name)) throw new FileError('Dori nomi 2–80 belgidan iborat boʻlishi va faqat harf, raqam hamda oddiy belgilardan tashkil topishi kerak.');
    if (!ai) {
      return res.json({ ...base, source: 'name', unavailable: true,
        notice: 'Dori nomi boʻyicha maʼlumot olish uchun AI yoki rasmiy dori bazasi kerak. Demo rejimda bu funksiya mavjud emas — yoʻriqnoma faylini (PDF/TXT) yuklang yoki matnini joylashtiring.' });
    }
    return res.json({ ...base, source: 'name', medicine: fromAi(await aiExplainMedicine({ name })), dosageOmitted: true });
  } catch (err) {
    next(err);
  }
});

function respondLeaflet(res, base, text) {
  if (text.replace(/\s/g, '').length < 30) {
    return res.json({ ...base, source: 'document', unavailable: true,
      notice: 'Fayldan oʻqiladigan matn topilmadi (skanerlangan hujjat boʻlishi mumkin). Demo rejimda OCR mavjud emas.' });
  }
  const p = parseLeaflet(clip(text, config.maxLeafletChars));
  return res.json({
    ...base,
    source: 'document',
    medicine: {
      name: p.name, activeSubstance: p.activeSubstance, indications: p.indications, contraindications: p.contraindications,
      sideEffects: p.sideEffects, interactions: p.interactions, storage: p.storage, documentDate: p.documentDate,
      sourceNote: 'Foydalanuvchi yuklagan yoʻriqnoma matni. Boʻlimlar sarlavhalar boʻyicha avtomatik ajratildi (AI emas); matn oʻzgartirilmagan.',
    },
    dosageOmitted: p.dosageSectionFound,
    notice: p.recognizedSections
      ? ''
      : 'Yoʻriqnoma boʻlimlari (masalan, «Qarshi koʻrsatmalar») aniqlanmadi. Matn rasmiy yoʻriqnoma formatida ekanini tekshiring.',
  });
}

export default router;
