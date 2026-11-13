/**
 * Yuklangan fayllarni tekshirish (tur, hajm, "magic bytes") va PDF dan matn ajratish.
 * Fayllar diskka yozilmaydi — faqat xotirada qayta ishlanadi va so'rov tugagach o'chadi.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// pdf-parse ning index.js fayli test rejimida namunaviy fayl o'qiydi, shuning uchun lib yo'li ishlatiladi.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const SIGNATURES = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/png': (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'text/plain': (b) => !b.subarray(0, 4096).includes(0),
};

const EXT = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain' };

export class FileError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

/** Fayl turini kengaytma va ichki imzo bo'yicha aniqlaydi; ruxsat etilmagan bo'lsa xato. */
export function detectFileType(file, allowed) {
  if (!file || !file.buffer || file.size === 0) throw new FileError('Fayl tanlanmagan yoki boʻsh.');
  const ext = String(file.originalname || '').split('.').pop().toLowerCase();
  const type = EXT[ext];
  if (!type || !allowed.includes(type)) {
    throw new FileError('Bu fayl formati qoʻllab-quvvatlanmaydi.', 415);
  }
  if (!SIGNATURES[type](file.buffer)) {
    throw new FileError('Fayl mazmuni uning formatiga mos kelmaydi. Fayl buzilgan boʻlishi mumkin.', 415);
  }
  return type;
}

export async function extractPdfText(buffer) {
  try {
    // Kichik Buffer'lar Node xotira hovuzidan (pool) olinadi va byteOffset != 0 bo'ladi;
    // pdf.js esa .buffer ni to'liq o'qiydi. Shuning uchun mustaqil nusxa (Uint8Array) uzatiladi.
    const data = await pdfParse(new Uint8Array(buffer), { max: 30 });
    return { text: data.text || '', pages: data.numpages || 0 };
  } catch {
    throw new FileError('PDF faylni oʻqib boʻlmadi. Fayl buzilgan yoki parol bilan himoyalangan boʻlishi mumkin.', 422);
  }
}
