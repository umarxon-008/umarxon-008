/**
 * MEDAI server: statik frontendni beradi va AI API endpointlarini taqdim etadi.
 *   POST /api/chat
 *   POST /api/analyze-report
 *   POST /api/explain-medicine
 *   GET  /api/status
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { config, isAiEnabled, ROOT_DIR } from './config.js';
import statusRoute from './routes/status.js';
import chatRoute from './routes/chat.js';
import analyzeRoute from './routes/analyze.js';
import medicineRoute from './routes/medicine.js';

const NODE_MODULES = path.join(ROOT_DIR, 'node_modules');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'upgrade-insecure-requests': null, // localhost http orqali ishlashi uchun
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // --- API ---
  const api = express.Router();
  api.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Juda koʻp soʻrov yuborildi. Bir daqiqadan soʻng qayta urinib koʻring.' },
    }),
  );
  api.use(express.json({ limit: '100kb' }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(statusRoute);
  api.use(chatRoute);
  api.use(analyzeRoute);
  api.use(medicineRoute);
  api.use((_req, res) => res.status(404).json({ error: 'Bunday API manzili mavjud emas.' }));
  app.use('/api', api);

  // --- Statik fayllar (faqat ochiq papkalar; server/, .env, node_modules ochilmaydi) ---
  const staticOpts = { maxAge: '1h', index: false };
  for (const dir of ['css', 'js', 'assets', 'data']) {
    app.use(`/${dir}`, express.static(path.join(ROOT_DIR, dir), staticOpts));
  }
  app.get('/vendor/lucide.min.js', (_req, res) => res.sendFile(path.join(NODE_MODULES, 'lucide/dist/umd/lucide.min.js')));
  app.use('/vendor/fonts', express.static(path.join(NODE_MODULES, '@fontsource-variable/inter/files'), { maxAge: '7d' }));
  app.get('/', (_req, res) => res.sendFile(path.join(ROOT_DIR, 'index.html')));
  app.use((_req, res) => res.status(404).sendFile(path.join(ROOT_DIR, 'index.html')));

  // --- Xatolarni boshqarish: foydalanuvchiga maxfiy texnik tafsilot ko'rsatilmaydi ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? `Fayl hajmi ${config.maxFileBytes / 1024 / 1024} MB dan oshmasligi kerak.`
        : 'Fayl yuklashda xatolik. Bitta fayl yuklang.';
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: msg });
    }
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Soʻrov formati notoʻgʻri.' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Soʻrov hajmi juda katta.' });
    if (err?.expose && err.status) return res.status(err.status).json({ error: err.message, kind: err.kind });
    console.error(`[server] kutilmagan xato: ${err?.constructor?.name || 'Error'}`);
    return res.status(500).json({ error: 'Serverda kutilmagan xatolik yuz berdi. Qayta urinib koʻring.' });
  });

  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  createApp().listen(config.port, config.host, () => {
    const mode = isAiEnabled() ? `AI (${config.model})` : 'DEMO (AI kaliti ulanmagan)';
    console.log(`MEDAI ishga tushdi: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}  —  rejim: ${mode}`);
  });
}
