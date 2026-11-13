import { randomUUID } from 'node:crypto';
import {
  AiErrorMessages,
  type ChatEvent,
  type ChatMessage,
  type ChatSendResult,
  type Conversation,
  type ConversationSummary,
  type ToolActivity,
} from '@shared/ipc';
import { buildSystemPrompt } from '../../modules/ai/system-prompt';
import {
  ProviderError,
  type ChatTurn,
  type StreamEvent,
  type ToolCallRequest,
  type ToolDeclarationForModel,
} from '../../modules/ai/types';
import { makeTitle, type ConversationStore } from '../database/conversation-store';
import { AppError } from '../ipc/router';
import type { Logger } from '../logging/logger';
import type { ResolvedProvider } from './ai-service';

const MAX_TURNS = 24;
const MAX_CONTEXT_CHARS = 24_000;
const PERSIST_EVERY_MS = 400;
const MAX_TOOL_STEPS = 6;

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

/** Vositalarni bajaruvchi (ToolExecutor + ToolRegistry ustidagi yupqa qatlam) */
export interface ToolRunner {
  declarations(): ToolDeclarationForModel[];
  execute(
    call: ToolCallRequest,
    ctx: {
      conversationId: string;
      messageId: string;
      signal: AbortSignal;
      onActivity: (activity: ToolActivity) => void;
    },
  ): Promise<{ ok: boolean; message: string; verified: boolean | null; data?: unknown; errorCode?: string }>;
  activitiesFor(messageIds: string[]): ToolActivity[];
}

export interface ChatServiceDeps {
  stores: { persistent: ConversationStore; memory: ConversationStore };
  saveHistory: () => boolean;
  resolveProvider: () => Promise<ResolvedProvider>;
  emit: (event: ChatEvent) => void;
  logger: Logger;
  now?: () => Date;
  /** Kompyuter amallari (PHASE 4). Berilmasa, MARIUS faqat suhbatlashadi. */
  tools?: ToolRunner;
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
    const activities = this.deps.tools?.activitiesFor(conv.messages.map((m) => m.id)) ?? [];
    return { ...conv, activities };
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
      const decls = this.deps.tools?.declarations() ?? [];
      let toolsEnabled = decls.length > 0;
      const context: ChatTurn[] = buildContext(history);
      let steps = 0;
      const append = (text: string) => {
        content += text;
        emit({ type: 'delta', ...base, text });
        if (Date.now() - lastPersist > PERSIST_EVERY_MS) {
          store.updateMessage(messageId, { content });
          lastPersist = Date.now();
        }
      };

      // Vosita tsikli (§6.3–6.5): model → vosita chaqiruvi → bajarish (tasdiq bilan) → natija modelga → yakuniy javob
      for (;;) {
        let stepText = '';
        let toolCalls: Extract<StreamEvent, { type: 'tool_calls' }> | null = null;
        try {
          const stream = provider.streamChat(
            {
              model,
              system: buildSystemPrompt(this.deps.now?.() ?? new Date(), { toolsEnabled }),
              messages: context,
              ...(toolsEnabled ? { tools: decls } : {}),
            },
            signal,
          );
          for await (const ev of stream) {
            if (ev.type === 'text') {
              stepText += ev.text;
              append(ev.text);
            } else {
              toolCalls = ev;
            }
          }
        } catch (error) {
          // Model vositalarni qo'llamasa: bir marta vositalarsiz qayta urinish (tizim ko'rsatmasi ham moslashadi)
          if (
            error instanceof ProviderError &&
            error.code === 'AI_TOOLS_UNSUPPORTED' &&
            toolsEnabled &&
            !stepText
          ) {
            toolsEnabled = false;
            logger.warn('chat.tools_unsupported', { provider: provider.id, model });
            continue;
          }
          throw error;
        }
        if (!toolCalls || !this.deps.tools) break;

        steps++;
        if (steps > MAX_TOOL_STEPS) {
          append('\n\n(Juda ko‘p ketma-ket amal so‘raldi, xavfsizlik uchun to‘xtatildi.)');
          break;
        }
        context.push({
          role: 'assistant',
          content: stepText,
          toolCalls: toolCalls.calls,
          raw: toolCalls.raw,
        });
        for (const call of toolCalls.calls) {
          if (signal.aborted) throw new ProviderError('CANCELLED');
          const out = await this.deps.tools.execute(call, {
            conversationId,
            messageId,
            signal,
            onActivity: (activity) => emit({ type: 'tool', ...base, activity }),
          });
          context.push({
            role: 'tool',
            callId: call.id,
            providerId: call.providerId,
            name: call.name,
            result: {
              ok: out.ok,
              message: out.message,
              verified: out.verified,
              ...(out.errorCode ? { errorCode: out.errorCode } : {}),
              ...(out.data !== undefined ? { data: out.data } : {}),
            },
          });
        }
        if (signal.aborted) throw new ProviderError('CANCELLED');
        if (stepText && !stepText.endsWith('\n')) append('\n\n');
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
