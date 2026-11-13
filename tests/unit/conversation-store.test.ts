import { afterEach, describe, expect, it } from 'vitest';
import {
  makeTitle,
  MemoryConversationStore,
  SqliteConversationStore,
  type ConversationStore,
} from '../../src/main/database/conversation-store';
import { tempDatabase } from './helpers/db';

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

function stores(): [string, () => ConversationStore][] {
  return [
    [
      'sqlite',
      () => {
        const t = tempDatabase();
        cleanup = t.cleanup;
        return new SqliteConversationStore(t.db);
      },
    ],
    ['memory', () => new MemoryConversationStore()],
  ];
}

describe.each(stores())('%s suhbat ombori', (_name, make) => {
  it('suhbat, xabarlar, yangilash va o‘chirish', () => {
    const s = make();
    const c = s.createConversation('Test');
    const u = s.addMessage({
      conversationId: c.id,
      role: 'user',
      content: 'Salom',
      status: 'complete',
      provider: null,
      model: null,
    });
    const a = s.addMessage({
      conversationId: c.id,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider: 'ollama',
      model: 'm',
    });
    s.updateMessage(a.id, { content: 'Va alaykum', status: 'complete' });
    const conv = s.getConversation(c.id)!;
    expect(conv.messages.map((m) => [m.role, m.content, m.status])).toEqual([
      ['user', 'Salom', 'complete'],
      ['assistant', 'Va alaykum', 'complete'],
    ]);
    expect(conv.messages[0]!.id).toBe(u.id);
    s.updateMessage(a.id, { status: 'error', errorCode: 'AI_TIMEOUT' });
    expect(s.getConversation(c.id)!.messages[1]!.errorCode).toBe('AI_TIMEOUT');
    s.deleteMessage(a.id);
    expect(s.getConversation(c.id)!.messages).toHaveLength(1);
    s.deleteConversation(c.id);
    expect(s.getConversation(c.id)).toBeNull();
    expect(s.listConversations()).toEqual([]);
  });

  it('o‘zbekcha matn va emoji buzilmaydi', () => {
    const s = make();
    const c = s.createConversation('t');
    const text = 'O‘zbekiston, g‘alaba, “qo‘shtirnoq” 😊 — tire';
    s.addMessage({
      conversationId: c.id,
      role: 'user',
      content: text,
      status: 'complete',
      provider: null,
      model: null,
    });
    expect(s.getConversation(c.id)!.messages[0]!.content).toBe(text);
  });
});

describe('SqliteConversationStore', () => {
  it('crash’dan keyin “streaming” holatidagi xabarlar “error” bo‘ladi (bajarildi deb taxmin qilinmaydi)', () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const s = new SqliteConversationStore(t.db);
    const c = s.createConversation('t');
    const a = s.addMessage({
      conversationId: c.id,
      role: 'assistant',
      content: 'yarim',
      status: 'streaming',
      provider: 'gemini',
      model: 'm',
    });
    expect(s.recoverInterrupted()).toBe(1);
    const m = s.getConversation(c.id)!.messages.find((x) => x.id === a.id)!;
    expect(m.status).toBe('error');
    expect(m.errorCode).toBe('INTERRUPTED');
  });

  it('suhbat o‘chirilsa xabarlari ham o‘chadi (cascade)', () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const s = new SqliteConversationStore(t.db);
    const c = s.createConversation('t');
    s.addMessage({
      conversationId: c.id,
      role: 'user',
      content: 'x',
      status: 'complete',
      provider: null,
      model: null,
    });
    s.deleteConversation(c.id);
    expect((t.db.prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number }).n).toBe(0);
  });
});

describe('makeTitle', () => {
  it('birinchi xabardan qisqa sarlavha', () => {
    expect(makeTitle('  C++   sikllari  ')).toBe('C++ sikllari');
    expect(makeTitle('a'.repeat(100))).toHaveLength(58);
    expect(makeTitle('   ')).toBe('Yangi suhbat');
  });
});
