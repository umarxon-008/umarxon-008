import { opendir, stat } from 'node:fs/promises';
import path from 'node:path';

export interface FileHit {
  path: string;
  name: string;
  folder: string;
  ext: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
}

export interface SearchOptions {
  roots: string[];
  query?: string | undefined;
  extension?: string | undefined;
  modifiedWithinDays?: number | undefined;
  limit?: number;
  maxScanned?: number;
  maxDepth?: number;
  signal?: AbortSignal;
  onProgress?: (scanned: number) => void;
}

/** Qidiruvda o'tkazib yuboriladigan tizim va yashirin papkalar */
const SKIP_DIRS = new Set([
  'node_modules',
  'appdata',
  '$recycle.bin',
  'system volume information',
  'windows',
  '__pycache__',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, '')
    .replace(/[_\-.]+/g, ' ');
}

/**
 * Ruxsatli papkalarda fayl qidirish (prompt §10.2): nom, kengaytma, o'zgartirilgan sana.
 * Symlink'larga kirilmaydi, chuqurlik va skanerlash soni cheklangan, bekor qilish mumkin.
 * Main process bloklanmasligi uchun har 200 elementda navbat bo'shatiladi.
 */
export async function searchFiles(
  o: SearchOptions,
): Promise<{ results: FileHit[]; scanned: number; truncated: boolean }> {
  const limit = o.limit ?? 100;
  const maxScanned = o.maxScanned ?? 150_000;
  const maxDepth = o.maxDepth ?? 10;
  const tokens = o.query ? normalize(o.query).split(/\s+/).filter(Boolean) : [];
  const ext = o.extension?.toLowerCase().replace(/^\./, '');
  const since = o.modifiedWithinDays ? Date.now() - o.modifiedWithinDays * 86_400_000 : null;
  const results: FileHit[] = [];
  let scanned = 0;
  let truncated = false;

  const stack: { dir: string; depth: number }[] = o.roots.map((r) => ({ dir: r, depth: 0 }));
  while (stack.length) {
    if (o.signal?.aborted) throw new Error('cancelled');
    const { dir, depth } = stack.pop()!;
    let handle;
    try {
      handle = await opendir(dir);
    } catch {
      continue; // ruxsat yo'q yoki o'chirilgan
    }
    for await (const entry of handle) {
      scanned++;
      if (scanned % 200 === 0) {
        await new Promise((r) => setImmediate(r));
        o.onProgress?.(scanned);
        if (o.signal?.aborted) throw new Error('cancelled');
      }
      if (scanned >= maxScanned) {
        truncated = true;
        break;
      }
      if (entry.isSymbolicLink()) continue; // symlink orqali ruxsatli joydan chiqilmaydi
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        if (depth < maxDepth) stack.push({ dir: full, depth: depth + 1 });
      }
      if (!entry.isFile() && !entry.isDirectory()) continue;
      const entryExt = entry.isFile() ? path.extname(entry.name).slice(1).toLowerCase() : '';
      if (ext && entryExt !== ext) continue;
      const name = normalize(entry.name);
      if (tokens.length && !tokens.every((t) => name.includes(t))) continue;
      if (!tokens.length && !ext && !since) continue; // hech qanday shart bo'lmasa hamma narsani qaytarmaymiz
      let info;
      try {
        info = await stat(full);
      } catch {
        continue;
      }
      if (since && info.mtimeMs < since) continue;
      results.push({
        path: full,
        name: entry.name,
        folder: dir,
        ext: entryExt,
        size: info.size,
        modifiedAt: info.mtime.toISOString(),
        isDirectory: entry.isDirectory(),
      });
      if (results.length >= limit) {
        truncated = true;
        break;
      }
    }
    if (truncated) break;
  }
  results.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return { results, scanned, truncated };
}
