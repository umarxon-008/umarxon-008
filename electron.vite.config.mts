import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy renderer HTML'iga build vaqtida qo'yiladi.
 * Production: faqat o'z fayllarimiz. Inline script yo'q, tashqi ulanish yo'q.
 * Development: Vite HMR va React Fast Refresh uchun inline script va
 * localhost websocket'ga ruxsat beriladi.
 */
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* http://localhost:*",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'marius-csp',
    transformIndexHtml(html, ctx) {
      return html.replace('%MARIUS_CSP%', ctx.server ? DEV_CSP : PROD_CSP);
    },
  };
}

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as {
  version: string;
};

const sharedAlias = { '@shared': resolve(import.meta.dirname, 'src/shared') };

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    define: { __MARIUS_VERSION__: JSON.stringify(pkg.version) },
    build: {
      rollupOptions: { input: { index: resolve(import.meta.dirname, 'src/main/index.ts') } },
    },
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: { input: { index: resolve(import.meta.dirname, 'src/preload/index.ts') } },
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    resolve: {
      alias: { ...sharedAlias, '@renderer': resolve(import.meta.dirname, 'src/renderer/src') },
    },
    plugins: [react(), cspPlugin()],
    build: {
      rollupOptions: { input: { index: resolve(import.meta.dirname, 'src/renderer/index.html') } },
    },
  },
});
