import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatEvent, ChatMessage } from '@shared/ipc';
import { MemoryConversationStore, SqliteConversationStore } from '../../src/main/database/conversation-store';
import { buildContext, ChatService } from '../../src/main/services/chat-service';
import { ProviderError, type AIProvider, type ChatRequest } from '../../src/modules/ai/types';
import { AppError } from '../../src/main/ipc/router';
import { tempDatabase } from './helpers/db';

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function fakeProvider(script: (req: ChatRequest, signal: AbortSignal) => AsyncIterable<string>): AIProvider {
  return {
    id: 'ollama',
    getCapabilities: () => ({ streaming: true, tools: false, vision: false, cloud: false }),
    listModels: async () => ['m'],
    streamChat: script,
  };
}

let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

function setup(provider: AIProvider, opts: { saveHistory?: boolean; configured?: boolean } = {}) {
  const t = tempDatabase();
  cleanup = t.cleanup;
  const events: ChatEvent[] = [];
  const persistent = new SqliteConversationStore(t.db);
  const memory = new MemoryConversationStore();
  const service = new ChatService({
    stores: { persistent, memory },
    saveHistory: () => opts.saveHistory ?? true,
    resolveProvider: async () => {
      if (opts.configured === false) throw new AppError('AI_NOT_CONFIGURED');
      return { provider, model: 'm' };
    },
    emit: (e) => events.push(e),
    logger,
    now: () => new Date('2026-11-13T10:00:00Z'),
  });
  const waitFor = (type: ChatEvent['type']) =>
    vi.waitFor(() => {
      const e = events.find((x) => x.type === type);
      if (!e) throw new Error(`no ${type} yet`);
      return e;
    });
  return { service, events, persistent, memory, waitFor };
}

describe('ChatService', () => {
  it('xabar yuboradi, javobni oqim bilan oladi va saqlaydi', async () => {
    const seen: ChatRequest[] = [];
    const { service, events, waitFor } = setup(
      fakeProvider(async function* (req) {
        seen.push(req);
        yield 'Salom';
        yield '!';
      }),
    );
    const r = await service.send(null, 'Salom MARIUS');
    await waitFor('done');
    expect(events.filter((e) => e.type === 'delta').map((e) => (e as { text: string }).text)).toEqual([
      'Salom',
      '!',
    ]);
    const conv = service.getConversation(r.conversationId);
    expect(conv.title).toBe('Salom MARIUS');
    expect(conv.messages.map((m) => [m.role, m.content, m.status])).toEqual([
      ['user', 'Salom MARIUS', 'complete'],
      ['assistant', 'Salom!', 'complete'],
    ]);
    expect(seen[0]!.messages).toEqual([{ role: 'user', content: 'Salom MARIUS' }]);
    expect(seen[0]!.system).toContain('MARIUS');
    expect(seen[0]!.system).toContain('HECH QANDAY amal bajara olmaysan');
  });

  it('to‘xtatish: qisman javob “cancelled” bo‘lib saqlanadi', async () => {
    const { service, waitFor } = setup(
      fakeProvider(async function* (_req, signal) {
        yield 'Birinchi qism';
        await new Promise((_r, rej) => signal.addEventListener('abort', () => rej(signal.reason)));
      }),
    );
    const r = await service.send(null, 'Uzun javob ber');
    await waitFor('delta');
    expect(service.cancel(r.requestId)).toBe(true);
    const done = (await waitFor('done')) as Extract<ChatEvent, { type: 'done' }>;
    expect(done.status).toBe('cancelled');
    const a = service.getConversation(r.conversationId).messages[1]!;
    expect([a.status, a.content]).toEqual(['cancelled', 'Birinchi qism']);
    expect(service.isBusy()).toBe(false);
  });

  it('provayder xatosi: o‘zbekcha xabar va qayta urinish imkoniyati', async () => {
    const { service, waitFor } = setup(
      fakeProvider(async function* () {
        yield* []; // hech qanday matn chiqmasdan xato
        throw new ProviderError('AI_RATE_LIMITED');
      }),
    );
    const r = await service.send(null, 'Savol');
    const e = (await waitFor('error')) as Extract<ChatEvent, { type: 'error' }>;
    expect(e.code).toBe('AI_RATE_LIMITED');
    expect(e.retryable).toBe(true);
    expect(e.message).toMatch(/limit/);
    expect(service.getConversation(r.conversationId).messages[1]!.status).toBe('error');
  });

  it('qayta urinish: xato javob o‘chiriladi va yangisi yoziladi', async () => {
    let attempt = 0;
    const { service, events } = setup(
      fakeProvider(async function* () {
        attempt++;
        if (attempt === 1) throw new ProviderError('AI_NETWORK');
        yield 'Endi ishladi';
      }),
    );
    const r = await service.send(null, 'Savol');
    await vi.waitFor(() => expect(events.some((e) => e.type === 'error')).toBe(true));
    await service.regenerate(r.conversationId);
    await vi.waitFor(() => expect(events.some((e) => e.type === 'done')).toBe(true));
    const msgs = service.getConversation(r.conversationId).messages;
    expect(msgs.map((m) => [m.role, m.content, m.status])).toEqual([
      ['user', 'Savol', 'complete'],
      ['assistant', 'Endi ishladi', 'complete'],
    ]);
  });

  it('AI sozlanmagan bo‘lsa hech narsa yozilmaydi', async () => {
    const { service } = setup(
      fakeProvider(async function* () {
        yield 'x';
      }),
      { configured: false },
    );
    await expect(service.send(null, 'Salom')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    expect(service.listConversations()).toEqual([]);
  });

  it('javob yozilayotganda yangi xabar → BUSY', async () => {
    const { service, waitFor } = setup(
      fakeProvider(async function* (_r, signal) {
        yield 'a';
        await new Promise((_res, rej) => signal.addEventListener('abort', () => rej(signal.reason)));
      }),
    );
    const r = await service.send(null, '1');
    await waitFor('delta');
    await expect(service.send(r.conversationId, '2')).rejects.toMatchObject({ code: 'BUSY' });
    service.cancel(r.requestId);
  });

  it('tarix saqlash o‘chiq: suhbat bazaga yozilmaydi, faqat xotirada', async () => {
    const { service, persistent, memory, waitFor } = setup(
      fakeProvider(async function* () {
        yield 'ok';
      }),
      { saveHistory: false },
    );
    const r = await service.send(null, 'Maxfiy savol');
    await waitFor('done');
    expect(persistent.listConversations()).toEqual([]);
    expect(memory.getConversation(r.conversationId)?.messages).toHaveLength(2);
    expect(service.listConversations()[0]!.persisted).toBe(false);
  });
});

describe('buildContext', () => {
  const msg = (
    role: 'user' | 'assistant',
    content: string,
    status: ChatMessage['status'] = 'complete',
  ): ChatMessage => ({
    id: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
    role,
    content,
    status,
    provider: null,
    model: null,
    errorCode: null,
    createdAt: '',
  });

  it('xato va bo‘sh javoblarni tashlaydi, foydalanuvchi xabaridan boshlaydi', () => {
    const ctx = buildContext([
      msg('assistant', 'salom'),
      msg('user', 'a'),
      msg('assistant', '', 'error'),
      msg('assistant', 'yarim', 'error'),
      msg('user', 'b'),
    ]);
    expect(ctx).toEqual([
      { role: 'user', content: 'a' },
      { role: 'user', content: 'b' },
    ]);
  });

  it('uzun tarixni oxiridan qisqartiradi, oxirgi xabar doim kiradi', () => {
    const many = Array.from({ length: 59 }, (_, i) => msg(i % 2 === 0 ? 'user' : 'assistant', `x${i}`));
    const ctx = buildContext(many);
    expect(ctx.length).toBeLessThanOrEqual(24);
    expect(ctx.at(-1)!.content).toBe('x58');
    expect(ctx[0]!.role).toBe('user');
    const huge = buildContext([msg('user', 'y'.repeat(50_000))]);
    expect(huge).toHaveLength(1);
  });
});
