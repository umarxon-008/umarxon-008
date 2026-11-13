/**
 * Statik frontendni dist/ papkasiga yig'adi (Netlify "publish" papkasi).
 *   npm run build
 * Faqat ochiq fayllar ko'chiriladi: server kodi, .env, testlar va node_modules dist ga tushmaydi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const fonts = path.join(root, 'node_modules/@fontsource-variable/inter/files');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'vendor/fonts'), { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
for (const dir of ['css', 'js', 'assets', 'data', 'shared']) {
  fs.cpSync(path.join(root, dir), path.join(dist, dir), { recursive: true });
}
fs.copyFileSync(path.join(root, 'node_modules/lucide/dist/umd/lucide.min.js'), path.join(dist, 'vendor/lucide.min.js'));
fs.mkdirSync(path.join(dist, 'vendor/pdfjs'), { recursive: true });
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(root, 'node_modules/pdfjs-dist/build', f), path.join(dist, 'vendor/pdfjs', f));
}
for (const f of ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2', 'inter-cyrillic-wght-normal.woff2']) {
  fs.copyFileSync(path.join(fonts, f), path.join(dist, 'vendor/fonts', f));
}

const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`dist/ tayyor: ${count(dist)} ta fayl`);
