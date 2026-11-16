// NeuraMed — Tibbiy fayllar uchun shifrlangan saqlash qatlami
// STORAGE_PROVIDER=local (default) | supabase
// Har bir fayl AES-256-GCM bilan shifrlanib saqlanadi, faqat egasi yuklab oladi.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { encryptBuffer, decryptBuffer } from "@/lib/encryption";

const PROVIDER = process.env.STORAGE_PROVIDER || "local";
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage");

export interface StoredFile {
  key: string; // DB'da saqlanadigan kalit (fileUrl)
}

export async function saveEncryptedFile(
  userId: string,
  buffer: Buffer,
  originalName: string
): Promise<StoredFile> {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const key = `${userId}/${randomUUID()}${ext}.enc`;
  const encrypted = encryptBuffer(buffer);

  if (PROVIDER === "supabase") {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    const bucket = process.env.SUPABASE_BUCKET || "medical-files";
    if (!url || !serviceKey) throw new Error("Supabase sozlanmagan");
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(encrypted),
    });
    if (!res.ok) throw new Error(`Supabase upload xatosi: ${res.status}`);
    return { key: `supabase:${key}` };
  }

  const fullPath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, encrypted);
  return { key: `local:${key}` };
}

export async function readEncryptedFile(storedKey: string): Promise<Buffer | null> {
  try {
    const [provider, ...rest] = storedKey.split(":");
    const key = rest.join(":");
    if (key.includes("..")) return null;

    if (provider === "supabase") {
      const url = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;
      const bucket = process.env.SUPABASE_BUCKET || "medical-files";
      const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
        headers: { Authorization: `Bearer ${serviceKey}` },
      });
      if (!res.ok) return null;
      return decryptBuffer(Buffer.from(await res.arrayBuffer()));
    }

    const data = await fs.readFile(path.join(LOCAL_DIR, key));
    return decryptBuffer(data);
  } catch (err) {
    console.error("Fayl o'qish xatosi:", err);
    return null;
  }
}

export async function deleteEncryptedFile(storedKey: string | null | undefined) {
  if (!storedKey) return;
  try {
    const [provider, ...rest] = storedKey.split(":");
    const key = rest.join(":");
    if (provider === "local" && !key.includes("..")) {
      await fs.unlink(path.join(LOCAL_DIR, key));
    }
  } catch {
    /* ignore */
  }
}

export function mimeFromName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}
