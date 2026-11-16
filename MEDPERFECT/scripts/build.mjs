/**
 * Statik saytni dist/ papkasiga yig'adi (npm run build).
 *
 * dist/ uch xil usulda ishlaydi:
 *   1) index.html ni ikki marta bosib ochish (file://) — server kerak emas;
 *   2) istalgan statik hosting (Netlify Drop, GitHub Pages, Vercel);
 *   3) Netlify + Functions (netlify.toml) — AI rejimi uchun.
 *
 * file:// da brauzer JS modullarini, fetch() va Worker'ni bloklaydi. Shuning uchun:
 *   - barcha JS modullari esbuild bilan bitta oddiy skriptga (IIFE) yig'iladi: js/app.bundle.js;
 *   - kutubxona va namuna fayllar sahifaga skript sifatida joylanadi (window.MEDAI_TERMS / MEDAI_SAMPLES);
 *   - pdf.js oddiy skript sifatida yuklanadi va asosiy oqimda ishlaydi.
 * Server kodi, .env, testlar va node_modules dist ga tushmaydi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const nm = (p) => path.join(root, 'node_modules', p);
const out = (p) => path.join(dist, p);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(out('vendor/fonts'), { recursive: true });
fs.mkdirSync(out('vendor/pdfjs'), { recursive: true });
fs.mkdirSync(out('js'), { recursive: true });

// 1) Statik papkalar
for (const dir of ['css', 'assets', 'data', 'public']) fs.cpSync(path.join(root, dir), out(dir), { recursive: true });

// 2) JS: bitta oddiy skript (modulsiz) — file:// da ham ishlaydi
await build({
  entryPoints: [path.join(root, 'js/app.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: out('js/app.bundle.js'),
  legalComments: 'none',
  logLevel: 'warning',
});

// 3) Ma'lumot va namunalarni sahifaga joylash (file:// da fetch ishlamaydi)
const terms = JSON.parse(fs.readFileSync(path.join(root, 'data/medical-terms.json'), 'utf8'));
fs.writeFileSync(out('data/medical-terms.js'), `window.MEDAI_TERMS = ${JSON.stringify(terms)};\n`);
const samples = {};
for (const f of ['assets/samples/namuna-qon-tahlili.pdf', 'assets/samples/namuna-yoriqnoma.txt']) {
  samples[f] = fs.readFileSync(path.join(root, f)).toString('base64');
}
fs.writeFileSync(out('assets/samples/samples.js'), `window.MEDAI_SAMPLES = ${JSON.stringify(samples)};\n`);

// 4) Vendor fayllar. Minifikatsiyalangan JS dagi xom boshqaruv belgilari (\x00–\x1f) satr ichida
//    ekvivalent \xNN yozuviga almashtiriladi — ba'zi hostinglar (masalan, claude.ai artifact) ularni rad etadi.
const copyJs = (from, to) => {
  const buf = fs.readFileSync(from);
  const parts = [];
  let start = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const c = buf[i];
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) {
      parts.push(buf.subarray(start, i), Buffer.from(`\\x${c.toString(16).padStart(2, '0')}`));
      start = i + 1;
    }
  }
  parts.push(buf.subarray(start));
  fs.writeFileSync(to, Buffer.concat(parts));
};
copyJs(nm('lucide/dist/umd/lucide.min.js'), out('vendor/lucide.min.js'));
for (const f of ['pdf.min.js', 'pdf.worker.min.js']) copyJs(nm(`pdfjs-dist/build/${f}`), out(`vendor/pdfjs/${f}`));
for (const f of ['inter-latin-wght-normal.woff2', 'inter-latin-ext-wght-normal.woff2', 'inter-cyrillic-wght-normal.woff2']) {
  fs.copyFileSync(nm(`@fontsource-variable/inter/files/${f}`), out(`vendor/fonts/${f}`));
}

// 5) index.html: modul o'rniga ma'lumot skriptlari + bitta yig'ilgan skript
const MODULE_TAG = '<script type="module" src="js/app.js"></script>';
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes(MODULE_TAG)) throw new Error('index.html da modul skript tegi topilmadi');
html = html.replace('<script src="js/boot-check.js"></script>\n  ', '');
html = html.replace(MODULE_TAG, [
  '<script src="data/medical-terms.js"></script>',
  '  <script src="assets/samples/samples.js"></script>',
  '  <script src="js/app.bundle.js" defer></script>',
].join('\n'));
fs.writeFileSync(out('index.html'), html);

const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`dist/ tayyor: ${count(dist)} ta fayl (index.html ni toʻgʻridan-toʻgʻri ochish mumkin)`);
