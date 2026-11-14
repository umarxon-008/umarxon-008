import { appendFile, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { searchFiles } from '../files/file-search';
import { guardExisting, guardNew, validateFileName } from '../files/path-guard';

/**
 * Obsidian Vault bilan filesystem orqali ishlash (prompt v2.1 §3). Obsidian'ning ichki API'lariga tayanilmaydi:
 * Vault oddiy papka, note'lar UTF-8 Markdown. Barcha yo'llar Vault ildizidan chiqmasligi tekshiriladi.
 */

export interface NoteHit {
  path: string;
  name: string;
  snippet: string;
  modifiedAt: string;
}

const MAX_NOTE_BYTES = 1024 * 1024;
const MAX_READ_CHARS = 8000;

function snippetAround(text: string, query: string, size = 160): string {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text.slice(0, size).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, i - size / 2);
  return `${start > 0 ? '…' : ''}${text
    .slice(start, start + size)
    .replace(/\s+/g, ' ')
    .trim()}…`;
}

/** Note nomi: fayl nomi qoidalari + .md */
export function noteFileName(title: string): string | null {
  const name = title.trim().replace(/\.md$/i, '');
  return validateFileName(name) === null ? `${name}.md` : null;
}

/** Yangi note mazmuni: minimal va hujjatlashtirilgan YAML frontmatter (created, source) */
export function buildNote(title: string, body: string, now = new Date()): string {
  return `---\ncreated: ${now.toISOString()}\nsource: MARIUS\n---\n\n# ${title.trim()}\n\n${body.trim()}\n`;
}

export class VaultService {
  /** mtime bo'yicha kesh: o'zgarmagan fayl qayta o'qilmaydi (indekslash) */
  private cache = new Map<string, { mtimeMs: number; text: string }>();
  lastIndexedAt: string | null = null;

  constructor(private readonly vault: () => string | null) {}

  private root(): string {
    const v = this.vault();
    if (!v) throw Object.assign(new Error('NO_VAULT'), { code: 'NO_VAULT' });
    return v;
  }

  async listNotes(signal?: AbortSignal): Promise<{ path: string; modifiedAt: string; size: number }[]> {
    const r = await searchFiles({
      roots: [this.root()],
      extension: 'md',
      limit: 5000,
      maxScanned: 50_000,
      ...(signal ? { signal } : {}),
    });
    return r.results
      .filter((f) => !f.isDirectory && !f.path.includes(`${path.sep}.trash${path.sep}`))
      .map((f) => ({ path: f.path, modifiedAt: f.modifiedAt, size: f.size }));
  }

  /** Nom va matn bo'yicha qidiruv (faqat .md, rasm/PDF o'qilmaydi) */
  async search(query: string, limit = 20, signal?: AbortSignal): Promise<NoteHit[]> {
    const q = query.toLowerCase().trim();
    const hits: NoteHit[] = [];
    const seen = new Set<string>();
    for (const note of await this.listNotes(signal)) {
      seen.add(note.path);
      const name = path.basename(note.path, '.md');
      let text = '';
      if (note.size <= MAX_NOTE_BYTES) {
        const info = await stat(note.path);
        const cached = this.cache.get(note.path);
        if (cached && cached.mtimeMs === info.mtimeMs) text = cached.text;
        else {
          text = await readFile(note.path, 'utf8');
          this.cache.set(note.path, { mtimeMs: info.mtimeMs, text });
        }
      }
      if (name.toLowerCase().includes(q) || text.toLowerCase().includes(q)) {
        hits.push({ path: note.path, name, snippet: snippetAround(text, q), modifiedAt: note.modifiedAt });
        if (hits.length >= limit) break;
      }
    }
    for (const k of this.cache.keys()) if (!seen.has(k) && !k.startsWith(this.root())) this.cache.delete(k);
    this.lastIndexedAt = new Date().toISOString();
    return hits;
  }

  clearIndex(): void {
    this.cache.clear();
    this.lastIndexedAt = null;
  }

  async resolveNote(notePath: string): Promise<{ ok: true; real: string } | { ok: false; reason: string }> {
    const g = await guardExisting(notePath, [this.root()]);
    if (!g.ok) return { ok: false, reason: g.reason };
    if (path.extname(g.real).toLowerCase() !== '.md') return { ok: false, reason: 'NOT_MARKDOWN' };
    return { ok: true, real: g.real };
  }

  async read(notePath: string): Promise<{ text: string; truncated: boolean; real: string }> {
    const r = await this.resolveNote(notePath);
    if (!r.ok) throw Object.assign(new Error(r.reason), { code: r.reason });
    const text = await readFile(r.real, 'utf8');
    return { text: text.slice(0, MAX_READ_CHARS), truncated: text.length > MAX_READ_CHARS, real: r.real };
  }

  /** Yangi note manzili (mavjud bo'lsa — xato, ustidan yozilmaydi) */
  async planNew(
    title: string,
    folder?: string,
  ): Promise<{ ok: true; real: string } | { ok: false; reason: string }> {
    const file = noteFileName(title);
    if (!file) return { ok: false, reason: 'BAD_NAME' };
    const root = this.root();
    const parent = folder ? path.join(root, folder) : root;
    const g = await guardNew(parent, file, [root]);
    if (!g.ok) return { ok: false, reason: g.reason };
    try {
      await stat(g.real);
      return { ok: false, reason: 'ALREADY_EXISTS' };
    } catch {
      return { ok: true, real: g.real };
    }
  }

  /** "wx": fayl mavjud bo'lsa yozilmaydi (poyga holatida ham) */
  async create(real: string, content: string): Promise<void> {
    await writeFile(real, content, { encoding: 'utf8', flag: 'wx' });
  }

  /** Oxiriga qo'shish: tayyorlangandan keyin fayl o'zgargan bo'lsa (masalan, Obsidian'da) rad etiladi */
  async append(real: string, text: string, expectedMtimeMs: number): Promise<void> {
    const info = await stat(real);
    if (info.mtimeMs !== expectedMtimeMs) throw Object.assign(new Error('CHANGED'), { code: 'NOTE_CHANGED' });
    await appendFile(real, `\n\n${text.trim()}\n`, 'utf8');
  }
}
