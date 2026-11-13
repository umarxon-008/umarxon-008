import { Router } from 'express';
import { isAiEnabled, config } from '../config.js';
import { uploadSingle } from './upload.js';
import { detectFileType, extractPdfText } from '../services/files.js';
import { parseLabText } from '../services/labParser.js';
import { aiAnalyzeReport } from '../services/ai.js';
import { clip } from '../services/text.js';

const router = Router();
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];

const BASE_LIMITATIONS = [
  'Qiymatlar hujjatdan avtomatik ajratildi — oʻqishda xato boʻlishi mumkin, shuning uchun ularni hujjat bilan solishtirib tasdiqlashingiz soʻraladi.',
  'Reference range (meʼyoriy oraliq) laboratoriya, uskuna, yosh, jins, homiladorlik va boshqa omillarga qarab farq qiladi.',
  'Solishtirish faqat hujjatda yozilgan oraliq asosida qilinadi. Oraliq yozilmagan boʻlsa, baho berilmaydi.',
  'Bu talqin tashxis emas va shifokor xulosasi oʻrnini bosmaydi.',
];

const toItem = (i) => ({
  name: clip(i.name, 80),
  value: clip(i.value ?? '', 20),
  unit: clip(i.unit ?? '', 24),
  referenceRange: clip(i.referenceRange ?? '', 40),
});

router.post('/analyze-report', uploadSingle, async (req, res, next) => {
  try {
    const type = detectFileType(req.file, ALLOWED);
    const file = { buffer: req.file.buffer, type };
    const fileInfo = { format: type === 'application/pdf' ? 'PDF' : type === 'image/png' ? 'PNG' : 'JPG', size: req.file.size };

    if (isAiEnabled()) {
      const r = await aiAnalyzeReport(file);
      return res.json({
        mode: 'ai',
        model: config.model,
        file: fileInfo,
        testName: clip(r.test_name || '', 120),
        items: (r.items || []).slice(0, 60).map((i) => toItem({ name: i.name, value: i.value, unit: i.unit, referenceRange: i.reference_range })),
        explanation: r.explanation || '',
        limitations: [...BASE_LIMITATIONS, ...(r.limitations || [])].slice(0, 8),
        doctorQuestions: (r.doctor_questions || []).slice(0, 6),
        urgentNote: r.urgent_note || '',
        sourceNote: 'Hujjat AI tomonidan oʻqildi. Umumiy izoh rasmiy manba bilan tasdiqlanmagan.',
      });
    }

    // DEMO: faqat matnli PDF qoidaga asoslanib o'qiladi. Rasm/skan uchun OCR mavjud emas.
    if (type !== 'application/pdf') {
      return res.json({
        mode: 'demo', file: fileInfo, ocrUnavailable: true, testName: '', items: [], limitations: BASE_LIMITATIONS,
        notice: 'Demo rejimda rasmdan matn oʻqish (OCR) mavjud emas — buning uchun AI ulanishi kerak. Qiymatlarni hujjatga qarab qoʻlda kiritishingiz mumkin.',
      });
    }
    const { text, pages } = await extractPdfText(req.file.buffer);
    if (text.replace(/\s/g, '').length < 20) {
      return res.json({
        mode: 'demo', file: { ...fileInfo, pages }, ocrUnavailable: true, testName: '', items: [], limitations: BASE_LIMITATIONS,
        notice: 'PDF ichida oʻqiladigan matn topilmadi (skanerlangan hujjat boʻlishi mumkin). Demo rejimda OCR mavjud emas — qiymatlarni qoʻlda kiriting.',
      });
    }
    const parsed = parseLabText(text);
    return res.json({
      mode: 'demo',
      file: { ...fileInfo, pages },
      testName: parsed.title ? clip(parsed.title, 120) : '',
      items: parsed.items.map((i) => toItem({ name: i.name, value: i.valueText, unit: i.unit, referenceRange: i.rangeText })),
      limitations: BASE_LIMITATIONS,
      notice: parsed.items.length
        ? 'Koʻrsatkichlar qoidaga asoslangan algoritm bilan ajratildi (AI emas).'
        : 'Hujjatdan koʻrsatkichlar aniqlanmadi. Hujjat formati notanish boʻlishi mumkin — qiymatlarni qoʻlda kiriting.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
