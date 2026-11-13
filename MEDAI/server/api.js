/**
 * MEDAI API ilovasi (faqat /api/*). Ikki joyda ishlatiladi:
 *   1) server/server.js — oddiy Node.js server (npm start)
 *   2) netlify/functions/api.mjs — Netlify Functions (serverless)
 */
import express from 'express';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import multer from 'multer';
import { config, isServerless } from './config.js';
import statusRoute from './routes/status.js';
import chatRoute from './routes/chat.js';
import analyzeRoute from './routes/analyze.js';
import medicineRoute from './routes/medicine.js';

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  if (isServerless) app.set('trust proxy', true);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      // Netlify mijoz IP manzilini alohida sarlavhada uzatadi
      keyGenerator: (req) => ipKeyGenerator(String(req.headers['x-nf-client-connection-ip'] || req.ip || '0.0.0.0')),
      validate: isServerless ? false : undefined,
      message: { error: 'Juda koʻp soʻrov yuborildi. Bir daqiqadan soʻng qayta urinib koʻring.' },
    }),
  );
  api.use(express.json({ limit: '100kb' }));
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(statusRoute);
  api.use(chatRoute);
  api.use(analyzeRoute);
  api.use(medicineRoute);
  api.use((_req, res) => res.status(404).json({ error: 'Bunday API manzili mavjud emas.' }));

  // Netlify'da so'rov "/api/..." yoki "/.netlify/functions/api/..." ko'rinishida kelishi mumkin
  app.use(['/api', '/.netlify/functions/api'], api);

  // Xatolarni boshqarish: foydalanuvchiga maxfiy texnik tafsilot ko'rsatilmaydi
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? `Fayl hajmi ${config.maxFileMb} MB dan oshmasligi kerak.`
        : 'Fayl yuklashda xatolik. Bitta fayl yuklang.';
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: msg });
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Soʻrov formati notoʻgʻri.' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Soʻrov hajmi juda katta.' });
    if (err?.expose && err.status) return res.status(err.status).json({ error: err.message, kind: err.kind });
    console.error(`[api] kutilmagan xato: ${err?.constructor?.name || 'Error'}`);
    return res.status(500).json({ error: 'Serverda kutilmagan xatolik yuz berdi. Qayta urinib koʻring.' });
  });

  return app;
}
