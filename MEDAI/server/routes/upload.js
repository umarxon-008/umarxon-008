/** Fayl yuklash uchun umumiy multer sozlamasi: faqat xotirada, 1 ta fayl, hajm cheklovi bilan. */
import multer from 'multer';
import { config } from '../config.js';

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: 1, fields: 5, fieldSize: 64 * 1024 },
}).single('file');
