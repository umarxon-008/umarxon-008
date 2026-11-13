import { randomUUID } from 'node:crypto';
import type { MemoryItem } from '@shared/ipc';
import type { Database } from '../database/database';

interface Row {
  id: string;
  content: string;
  source: MemoryItem['source'];
  created_at: string;
  updated_at: string;
}
const toItem = (r: Row): MemoryItem => ({
  id: r.id,
  content: r.content,
  source: r.source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const now = () => new Date().toISOString();

/** Maxfiy ma'lumot sukut bo'yicha saqlanmaydi (prompt §14): parol, karta raqami, kalit va h.k. */
export function looksSensitive(text: string): boolean {
  return (
    /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/.test(text) || // bank kartasi (bo'sh joy yoki tire bilan ham)
    /(parol|password|пароль|pin\s*kod|cvv|api[\s_-]?key|token|secret)\s*[:=]?\s*\S+/i.test(text) ||
    /AIza[0-9A-Za-z_-]{20,}/.test(text) || // Google API kaliti
    /\b[A-Z]{2}\d{7}\b/.test(text) // pasport seriyasi (masalan, AA1234567)
  );
}

/** Foydalanuvchi boshqaradigan xotira (prompt §14). */
export class MemoryRepository {
  constructor(private readonly db: Database) {}

  list(): MemoryItem[] {
    return (
      this.db.prepare('SELECT * FROM memory_items ORDER BY updated_at DESC').all() as unknown as Row[]
    ).map(toItem);
  }

  search(query: string, limit = 20): MemoryItem[] {
    const q = `%${query.toLowerCase().replace(/[%_]/g, '')}%`;
    return (
      this.db
        .prepare('SELECT * FROM memory_items WHERE lower(content) LIKE ? ORDER BY updated_at DESC LIMIT ?')
        .all(q, limit) as unknown as Row[]
    ).map(toItem);
  }

  get(id: string): MemoryItem | null {
    const r = this.db.prepare('SELECT * FROM memory_items WHERE id = ?').get(id) as Row | undefined;
    return r ? toItem(r) : null;
  }

  create(content: string, source: MemoryItem['source']): MemoryItem {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        'INSERT INTO memory_items (id, content, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, content.trim(), source, ts, ts);
    return this.get(id)!;
  }

  update(id: string, content: string): void {
    this.db
      .prepare('UPDATE memory_items SET content = ?, updated_at = ? WHERE id = ?')
      .run(content.trim(), now(), id);
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM memory_items WHERE id = ?').run(id).changes) > 0;
  }

  clear(): void {
    this.db.exec('DELETE FROM memory_items');
  }

  /** Modelga yuboriladigan minimal kontekst (prompt §14: miqdor minimal) */
  forPrompt(maxItems = 15, maxChars = 2000): string[] {
    const out: string[] = [];
    let chars = 0;
    for (const item of this.list().slice(0, maxItems)) {
      if (chars + item.content.length > maxChars) break;
      out.push(item.content);
      chars += item.content.length;
    }
    return out;
  }
}
