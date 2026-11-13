import { randomUUID } from 'node:crypto';
import {
  AiErrorMessages,
  type ChatEvent,
  type ChatMessage,
  type ChatSendResult,
  type Conversation,
  type ConversationSummary,
} from '@shared/ipc';
import { buildSystemPrompt } from '../../modules/ai/system-prompt';
import { ProviderError, type ChatTurn } from '../../modules/ai/types';
import { makeTitle, type ConversationStore } from '../database/conversation-store';
import { AppError } from '../ipc/router';
import type { Logger } from '../logging/logger';
import type { ResolvedProvider } from './ai-service';

const MAX_TURNS = 24;
const MAX_CONTEXT_CHARS = 24_000;
const PERSIST_EVERY_MS = 400;

/**
 * Modelga yuboriladigan tarixni tayyorlaydi: faqat oxirgi qismi, belgilar limiti bilan.
 * Xato bilan tugagan yoki bo'sh javoblar yuborilmaydi. Oxirgi foydalanuvchi xabari doim kiradi.
 */
export function buildContext(messages: ChatMessage[]): ChatTurn[] {
  const usable = messages.filter(
    (m) =>
      m.content.trim().length > 0 &&
      (m.role === 'user' || m.status === 'complete' || m.status === 'cancelled'),
  );
  const turns: ChatTurn[] = [];
  let chars = 0;
  for (let i = usable.length - 1; i >= 0 && turns.length < MAX_TURNS; i--) {
    const m = usable[i]!;
    if (turns.length > 0 && chars + m.content.length > MAX_CONTEXT_CHARS) break;
    turns.unshift({ role: m.role, content: m.content });
    chars += m.content.length;
  }
  // Model suhbatni foydalanuvchi xabari bilan boshlashi kerak
  while (turns.length > 0 && turns[0]!.role !== 'user') turns.shift();
  return turns;
}

interface Active {
  controller: AbortController;
  conversationId: string;
  messageId: string;
}

export interface ChatServiceDeps {
  stores: { persistent: ConversationStore; memory: ConversationStore };
  saveHistory: () => boolean;
  resolveProvider: () => Promise<ResolvedProvider>;
  emit: (event: ChatEvent) => void;
  logger: Logger;
  now?: () => Date;
}

/** Suhbat servisi: xabar yuborish, oqim, to'xtatish, qayta urinish (ARCHITECTURE §5). */
export class ChatService {
  private active = new Map<string, Active>();

  constructor(private readonly deps: ChatServiceDeps) {}

  private storeFor(conversationId: string): ConversationStore | null {
    const { persistent, memory } = this.deps.stores;
    if (memory.hasConversation(conversationId)) return memory;
    if (persistent.hasConversation(conversationId)) return persistent;
    return null;
  }

  listConversations(): ConversationSummary[] {
    const { persistent, memory } = this.deps.stores;
    return [...memory.listConversations(), ...persistent.listConversations()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  getConversation(id: string): Conversation {
    const store = this.storeFor(id);
    const conv = store?.getConversation(id);
    if (!conv) throw new AppError('NOT_FOUND');
    return conv;
  }

  deleteConversation(id: string): void {
    for (const [requestId, a] of this.active) if (a.conversationId === id) this.cancel(requestId);
    this.storeFor(id)?.deleteConversation(id);
  }

  clearAll(): void {
    for (const requestId of [...this.active.keys()]) this.cancel(requestId);
    this.deps.stores.persistent.clear();
    this.deps.stores.memory.clear();
  }

  isBusy(conversationId?: string): boolean {
    if (!conversationId) return this.active.size > 0;
    return [...this.active.values()].some((a) => a.conversationId === conversationId);
  }

  async send(conversationId: string | null, text: string): Promise<ChatSendResult> {
    if (this.isBusy()) throw new AppError('BUSY');
    const resolved = await this.deps.resolveProvider(); // sozlanmagan bo'lsa, hech narsa yozilmasdan xato

    let store: ConversationStore;
    let convId: string;
    if (conversationId) {
      const found = this.storeFor(conversationId);
      if (!found) throw new AppError('NOT_FOUND');
      store = found;
      convId = conversationId;
    } else {
      store = this.deps.saveHistory() ? this.deps.stores.persistent : this.deps.stores.memory;
      convId = store.createConversation(makeTitle(text)).id;
    }

    const userMessage = store.addMessage({
      conversationId: convId,
      role: 'user',
      content: text.trim(),
      status: 'complete',
      provider: null,
      model: null,
    });
    const { requestId, assistantMessage } = this.start(store, convId, resolved);
    return { conversationId: convId, requestId, userMessage, assistantMessage };
  }

  /** Oxirgi javob xato bilan tugagan yoki to'xtatilgan bo'lsa, uni qayta yaratadi. */
  async regenerate(conversationId: string): Promise<{ requestId: string; assistantMessage: ChatMessage }> {
    if (this.isBusy()) throw new AppError('BUSY');
    const store = this.storeFor(conversationId);
    const conv = store?.getConversation(conversationId);
    if (!store || !conv) throw new AppError('NOT_FOUND');
    const resolved = await this.deps.resolveProvider();
    const last = conv.messages.at(-1);
    if (last?.role === 'assistant') store.deleteMessage(last.id);
    const remaining = store.getConversation(conversationId)!.messages;
    if (remaining.at(-1)?.role !== 'user') throw new AppError('NOT_FOUND');
    return this.start(store, conversationId, resolved);
  }

  cancel(requestId: string): boolean {
    const a = this.active.get(requestId);
    if (!a) return false;
    a.controller.abort(new ProviderError('CANCELLED'));
    return true;
  }

  private start(store: ConversationStore, conversationId: string, resolved: ResolvedProvider) {
    const assistantMessage = store.addMessage({
      conversationId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      provider: resolved.provider.id,
      model: resolved.model,
    });
    const requestId = randomUUID();
    const controller = new AbortController();
    this.active.set(requestId, { controller, conversationId, messageId: assistantMessage.id });
    void this.run(store, conversationId, assistantMessage.id, requestId, controller.signal, resolved);
    return { requestId, assistantMessage };
  }

  private async run(
    store: ConversationStore,
    conversationId: string,
    messageId: string,
    requestId: string,
    signal: AbortSignal,
    { provider, model }: ResolvedProvider,
  ): Promise<void> {
    const { emit, logger } = this.deps;
    const history = (store.getConversation(conversationId)?.messages ?? []).filter((m) => m.id !== messageId);
    const base = { requestId, conversationId, messageId };
    let content = '';
    let lastPersist = Date.now();
    const started = Date.now();
    logger.info('chat.request', { provider: provider.id, model, turns: history.length });

    try {
      const stream = provider.streamChat(
        {
          model,
          system: buildSystemPrompt(this.deps.now?.() ?? new Date()),
          messages: buildContext(history),
        },
        signal,
      );
      for await (const text of stream) {
        content += text;
        emit({ type: 'delta', ...base, text });
        if (Date.now() - lastPersist > PERSIST_EVERY_MS) {
          store.updateMessage(messageId, { content });
          lastPersist = Date.now();
        }
      }
      store.updateMessage(messageId, { content, status: 'complete', errorCode: null });
      emit({ type: 'done', ...base, status: 'complete' });
      logger.info('chat.complete', {
        provider: provider.id,
        chars: content.length,
        ms: Date.now() - started,
      });
    } catch (error) {
      const pe =
        error instanceof ProviderError
          ? error
          : error instanceof AppError && error.code in AiErrorMessages
            ? new ProviderError(error.code as keyof typeof AiErrorMessages)
            : new ProviderError('AI_BAD_RESPONSE', String(error));
      if (pe.code === 'CANCELLED') {
        store.updateMessage(messageId, { content, status: 'cancelled' });
        emit({ type: 'done', ...base, status: 'cancelled' });
        logger.info('chat.cancelled', { provider: provider.id, chars: content.length });
      } else {
        store.updateMessage(messageId, { content, status: 'error', errorCode: pe.code });
        emit({
          type: 'error',
          ...base,
          code: pe.code,
          message: AiErrorMessages[pe.code],
          retryable: pe.retryable,
        });
        logger.warn('chat.error', { provider: provider.id, code: pe.code, detail: pe.detail });
      }
    } finally {
      this.active.delete(requestId);
    }
  }
}
