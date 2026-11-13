/**
 * MEDAI oddiy Node.js serveri (npm start): statik frontend + /api/* endpointlari.
 *   POST /api/chat · POST /api/analyze-report · POST /api/explain-medicine · GET /api/status
 * Netlify'da esa statik fayllar dist/ dan, API esa netlify/functions/api.mjs dan beriladi.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { config, isAiEnabled, ROOT_DIR } from './config.js';
import { createApiApp } from './api.js';

const NODE_MODULES = path.join(ROOT_DIR, 'node_modules');

/** Netlify netlify.toml dagi bilan bir xil Content-Security-Policy. */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': null, // localhost http orqali ishlashi uchun
};

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: CSP_DIRECTIVES }, crossOriginEmbedderPolicy: false }));

  app.use(createApiApp());

  // Statik fayllar (faqat ochiq papkalar; server/, .env, node_modules ochilmaydi)
  const staticOpts = { maxAge: '1h', index: false };
  for (const dir of ['css', 'js', 'assets', 'data']) {
    app.use(`/${dir}`, express.static(path.join(ROOT_DIR, dir), staticOpts));
  }
  app.get('/vendor/lucide.min.js', (_req, res) => res.sendFile(path.join(NODE_MODULES, 'lucide/dist/umd/lucide.min.js')));
  app.use('/vendor/fonts', express.static(path.join(NODE_MODULES, '@fontsource-variable/inter/files'), { maxAge: '7d' }));
  app.get('/', (_req, res) => res.sendFile(path.join(ROOT_DIR, 'index.html')));
  app.use((_req, res) => res.status(404).sendFile(path.join(ROOT_DIR, 'index.html')));
  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  createApp().listen(config.port, config.host, () => {
    const mode = isAiEnabled() ? `AI (${config.model})` : 'DEMO (AI kaliti ulanmagan)';
    console.log(`MEDAI ishga tushdi: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}  —  rejim: ${mode}`);
  });
}
