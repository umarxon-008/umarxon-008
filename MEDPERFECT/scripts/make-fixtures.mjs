/**
 * Sinov va demo uchun SINTETIK (soxta) namuna fayllarni yaratadi.
 * Ular haqiqiy bemor yoki haqiqiy dori yo'riqnomasiga tegishli EMAS.
 *   node scripts/make-fixtures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Bog'liqliksiz minimal matnli PDF (Helvetica, ASCII). */
export function makePdf(lines) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const body = lines.length
    ? ['BT', '/F1 11 Tf', '15 TL', '56 790 Td', ...lines.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n')
    : '0.9 0.9 0.9 rg 56 600 480 180 re f'; // matnsiz (skanerlangan hujjatga o'xshash) sahifa
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const LAB = [
  'NAMUNA LABORATORIYA (SINTETIK HUJJAT - HAQIQIY BEMOR EMAS)',
  'Umumiy qon tahlili va biokimyo (NAMUNA)',
  'Sana: 01.11.2026',
  'Bemor: NAMUNA BEMOR',
  '',
  "Ko'rsatkich    Natija    Birlik    Me'yor",
  'Gemoglobin (HGB) 112 g/L 120 - 160',
  'Leykotsitlar (WBC) 7,4 10^9/L 4.0 - 9.0',
  'Trombotsitlar (PLT) 250 10^9/L 180 - 320',
  'Glyukoza 6.4 mmol/L 3.9 - 5.5 H',
  'Xolesterin 4.8 mmol/L < 5.2',
  'Kreatinin 80 umol/L',
  'Vitamin D (25-OH) 18 ng/mL 30 - 100',
  'CRP 3 mg/L < 5',
  '',
  'Izoh: bu hujjat MEDAI demo va testlari uchun yaratilgan sintetik namuna.',
];

const LEAFLET = [
  'NAMUNA-DORI 500 (SINTETIK YO\'RIQNOMA - HAQIQIY DORI EMAS)',
  'Savdo nomi: Namuna-dori 500',
  "Ta'sir etuvchi modda: namunamol 500 mg",
  "Qo'llanilishi",
  "Bu bo'lim sinov uchun yozilgan namunaviy matn.",
  "Qarshi ko'rsatmalar:",
  'Tarkibidagi moddalarga yuqori sezuvchanlik.',
  "Og'ir jigar yetishmovchiligi.",
  "Qo'llash usuli va dozalari",
  'Bu bo\'lim MEDAI tomonidan ko\'rsatilmasligi kerak (NAMUNA).',
  "Nojo'ya ta'sirlari",
  'Kam hollarda teri toshmasi, ko\'ngil aynishi.',
  "Dorilararo o'zaro ta'siri",
  'Boshqa dorilar bilan birga qabul qilishdan oldin shifokor bilan maslahatlashing.',
  'Saqlash sharoiti: 25 C dan past haroratda, bolalar ololmaydigan joyda saqlansin.',
  "Yo'riqnoma tasdiqlangan sana: 12.03.2026",
];

fs.mkdirSync(path.join(root, 'assets/samples'), { recursive: true });
fs.mkdirSync(path.join(root, 'tests/fixtures'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets/samples/namuna-qon-tahlili.pdf'), makePdf(LAB));
fs.writeFileSync(path.join(root, 'tests/fixtures/namuna-qon-tahlili.pdf'), makePdf(LAB));
fs.writeFileSync(path.join(root, 'tests/fixtures/namuna-yoriqnoma.pdf'), makePdf(LEAFLET));
fs.writeFileSync(path.join(root, 'tests/fixtures/namuna-yoriqnoma.txt'), LEAFLET.join('\n'));
fs.writeFileSync(path.join(root, 'tests/fixtures/skan-namuna.pdf'), makePdf([]));
fs.writeFileSync(path.join(root, 'tests/fixtures/notogri-format.docx'), 'bu docx emas');
fs.writeFileSync(path.join(root, 'tests/fixtures/soxta.pdf'), 'Bu PDF emas, oddiy matn.');
console.log('Sintetik namuna fayllar yaratildi.');
