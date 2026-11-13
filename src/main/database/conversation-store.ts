import { randomUUID } from 'node:crypto';
import type { ChatMessage, Conversation, ConversationSummary, ProviderId } from '@shared/ipc';
import type { Database } from './database';

export type MessageStatus = ChatMessage['status'];

export interface NewMessage {
  conversationId: string;
  role: ChatMessage['role'];
  content: string;
  status: MessageStatus;
  provider: ProviderId | null;
  model: string | null;
}

/** Suhbat ombori interfeysi: SQLite (tarix saqlanadi) yoki xotira (tarix saqlanmaydi). */
export interface ConversationStore {
  readonly persisted: boolean;
  createConversation(title: string): ConversationSummary;
  hasConversation(id: string): boolean;
  listConversations(): ConversationSummary[];
  getConversation(id: string): Conversation | null;
  addMessage(message: NewMessage): ChatMessage;
  updateMessage(
    id: string,
    patch: { content?: string; status?: MessageStatus; errorCode?: string | null },
  ): void;
  deleteMessage(id: string): void;
  deleteConversation(id: string): void;
  clear(): void;
  /** Ilova crash bo'lgan bo'lsa, "streaming" holatida qolgan xabarlarni "error" deb belgilaydi. */
  recoverInterrupted(): number;
}

const now = () => new Date().toISOString();

export function makeTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine || 'Yangi suhbat';
}

/* ---------------- SQLite ---------------- */

interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  status: MessageStatus;
  provider: ProviderId | null;
  model: string | null;
  error_code: string | null;
  created_at: string;
}

function toMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    status: r.status,
    provider: r.provider,
    model: r.model,
    errorCode: r.error_code,
    createdAt: r.created_at,
  };
}

export class SqliteConversationStore implements ConversationStore {
  readonly persisted = true;
  constructor(private readonly db: Database) {}

  createConversation(title: string): ConversationSummary {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, title, ts, ts);
    return { id, title, updatedAt: ts, persisted: true };
  }

  hasConversation(id: string): boolean {
    return this.db.prepare('SELECT 1 FROM conversations WHERE id = ?').get(id) !== undefined;
  }

  listConversations(): ConversationSummary[] {
    const rows = this.db
      .prepare('SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 200')
      .all() as { id: string; title: string; updated_at: string }[];
    return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at, persisted: true }));
  }

  getConversation(id: string): Conversation | null {
    const c = this.db.prepare('SELECT id, title, updated_at FROM conversations WHERE id = ?').get(id) as
      { id: string; title: string; updated_at: string } | undefined;
    if (!c) return null;
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid')
      .all(id) as unknown as MessageRow[];
    return {
      id: c.id,
      title: c.title,
      updatedAt: c.updated_at,
      persisted: true,
      messages: rows.map(toMessage),
      activities: [],
    };
  }

  addMessage(m: NewMessage): ChatMessage {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, status, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, m.conversationId, m.role, m.content, m.status, m.provider, m.model, ts, ts);
    this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(ts, m.conversationId);
    return { id, ...m, errorCode: null, createdAt: ts };
  }

  updateMessage(id: string, patch: { content?: string; status?: MessageStatus; errorCode?: string | null }) {
    this.db
      .prepare(
        `UPDATE messages SET
           content = COALESCE(?, content),
           status = COALESCE(?, status),
           error_code = CASE WHEN ? THEN ? ELSE error_code END,
           updated_at = ?
         WHERE id = ?`,
      )
      .run(
        patch.content ?? null,
        patch.status ?? null,
        patch.errorCode !== undefined ? 1 : 0,
        patch.errorCode ?? null,
        now(),
        id,
      );
  }

  deleteMessage(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  deleteConversation(id: string): void {
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  }

  clear(): void {
    this.db.exec('DELETE FROM messages; DELETE FROM conversations;');
  }

  recoverInterrupted(): number {
    const r = this.db
      .prepare("UPDATE messages SET status = 'error', error_code = 'INTERRUPTED' WHERE status = 'streaming'")
      .run();
    return Number(r.changes);
  }
}

/* ---------------- Xotira (tarix saqlanmaydi) ---------------- */

export class MemoryConversationStore implements ConversationStore {
  readonly persisted = false;
  private conversations = new Map<string, { title: string; updatedAt: string; messages: ChatMessage[] }>();

  createConversation(title: string): ConversationSummary {
    const id = randomUUID();
    const ts = now();
    this.conversations.set(id, { title, updatedAt: ts, messages: [] });
    return { id, title, updatedAt: ts, persisted: false };
  }

  hasConversation(id: string): boolean {
    return this.conversations.has(id);
  }

  listConversations(): ConversationSummary[] {
    return [...this.conversations.entries()]
      .map(([id, c]) => ({ id, title: c.title, updatedAt: c.updatedAt, persisted: false }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getConversation(id: string): Conversation | null {
    const c = this.conversations.get(id);
    if (!c) return null;
    return {
      id,
      title: c.title,
      updatedAt: c.updatedAt,
      persisted: false,
      messages: c.messages.map((m) => ({ ...m })),
      activities: [],
    };
  }

  addMessage(m: NewMessage): ChatMessage {
    const c = this.conversations.get(m.conversationId);
    if (!c) throw new Error('conversation not found');
    const msg: ChatMessage = { id: randomUUID(), ...m, errorCode: null, createdAt: now() };
    c.messages.push(msg);
    c.updatedAt = msg.createdAt;
    return { ...msg };
  }

  updateMessage(id: string, patch: { content?: string; status?: MessageStatus; errorCode?: string | null }) {
    for (const c of this.conversations.values()) {
      const msg = c.messages.find((m) => m.id === id);
      if (!msg) continue;
      if (patch.content !== undefined) msg.content = patch.content;
      if (patch.status !== undefined) msg.status = patch.status;
      if (patch.errorCode !== undefined) msg.errorCode = patch.errorCode;
      return;
    }
  }

  deleteMessage(id: string): void {
    for (const c of this.conversations.values()) c.messages = c.messages.filter((m) => m.id !== id);
  }

  deleteConversation(id: string): void {
    this.conversations.delete(id);
  }

  clear(): void {
    this.conversations.clear();
  }

  recoverInterrupted(): number {
    return 0;
  }
}
