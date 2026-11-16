// NeuraMed — AES-256-GCM shifrlash + PII tozalash
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY (64 hex belgi) production'da majburiy");
    }
    return Buffer.alloc(32, 0); // faqat dev uchun
  }
  return Buffer.from(hex, "hex");
}

// ── Buffer (fayllar uchun) ────────────────────────────────────────────────────

export function encryptBuffer(data: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBuffer(buf: Buffer): Buffer {
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ── Matn ──────────────────────────────────────────────────────────────────────

export function encrypt(text: string): string {
  return encryptBuffer(Buffer.from(text, "utf8")).toString("base64");
}

export function decrypt(data: string): string {
  return decryptBuffer(Buffer.from(data, "base64")).toString("utf8");
}

/** Shifrlanmagan eski yozuvlar uchun xavfsiz decrypt (xato bo'lsa asl qiymat). */
export function decryptSafe(data: string | null | undefined): string {
  if (!data) return "";
  try {
    return decrypt(data);
  } catch {
    return data;
  }
}

export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson<T>(data: string): T {
  return JSON.parse(decrypt(data)) as T;
}

// ── PII tozalash (AI'ga yuborishdan oldin) ────────────────────────────────────

export function redactPII(text: string): string {
  if (!text) return "";
  return (
    text
      // Email
      .replace(/[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
      // Telefon (O'zbekiston va xalqaro)
      .replace(/\+?\d{1,3}[\s-]?\(?\d{2,3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "[TELEFON]")
      // Pasport / ID karta: AA1234567
      .replace(/\b[A-Z]{2}\s?\d{7}\b/g, "[PASPORT]")
      // JShShIR / PINFL (14 raqam)
      .replace(/\b\d{14}\b/g, "[JSHSHIR]")
      // Tug'ilgan sana qatorlari
      .replace(
        /((?:tug'?ilgan\s+sana|date\s+of\s+birth|dob|дата\s+рождения)\s*[:\-]?\s*)[^\n]+/gi,
        "$1[SANA]"
      )
      // Bemor ismi qatorlari
      .replace(
        /((?:F\.?I\.?(?:O|Sh)\.?|bemor|patient(?:\s+name)?|name|пациент|ф\.?и\.?о\.?)\s*[:\-]\s*)[^\n]+/gi,
        "$1[ISM]"
      )
      // Manzil
      .replace(/((?:manzil|address|адрес)\s*[:\-]\s*)[^\n]+/gi, "$1[MANZIL]")
  );
}
