import { Router } from 'express';
import { isAiEnabled, config } from '../config.js';
import { uploadSingle } from './upload.js';
import { detectFileType, extractPdfText } from '../services/files.js';
import { aiAnalyzeReport } from '../services/ai.js';
import { clip } from '../services/text.js';
import { BASE_LIMITATIONS, demoAnalysis, demoAnalysisImage, labItemFromAi } from '../../shared/reports.js';

const router = Router();
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];

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
        items: (r.items || []).slice(0, 60).map(labItemFromAi),
        explanation: r.explanation || '',
        limitations: [...BASE_LIMITATIONS, ...(r.limitations || [])].slice(0, 8),
        doctorQuestions: (r.doctor_questions || []).slice(0, 6),
        urgentNote: r.urgent_note || '',
        sourceNote: 'Hujjat AI tomonidan oʻqildi. Umumiy izoh rasmiy manba bilan tasdiqlanmagan.',
      });
    }

    // DEMO: faqat matnli PDF qoidaga asoslanib o'qiladi. Rasm/skan uchun OCR mavjud emas.
    if (type !== 'application/pdf') return res.json(demoAnalysisImage(fileInfo));
    const { text, pages } = await extractPdfText(req.file.buffer);
    return res.json(demoAnalysis(text, { ...fileInfo, pages }));
  } catch (err) {
    next(err);
  }
});

export default router;
