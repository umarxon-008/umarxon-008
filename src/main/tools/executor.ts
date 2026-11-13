import type { ToolActivity } from '@shared/ipc';
import { ErrorCodes } from '@shared/ipc';
import type { AuditRepository } from '../database/audit-repository';
import { AppError } from '../ipc/router';
import type { Logger } from '../logging/logger';
import type { ConfirmationBroker } from './confirmation';
import type { ToolRegistry } from './registry';
import type { ToolCall, ToolOutput } from './types';

export interface ExecuteContext {
  source: 'ai' | 'user';
  conversationId: string | null;
  messageId: string | null;
  signal: AbortSignal;
  /** Suhbatdagi amal kartasini yangilash uchun */
  onActivity?: (activity: ToolActivity) => void;
}

function withTimeout<T>(p: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new AppError('UNEXPECTED', 'timeout')), ms);
    signal.addEventListener('abort', () => reject(new AppError('UNEXPECTED', 'cancelled')), { once: true });
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/**
 * Har bir vosita chaqiruvi shu yerdan o'tadi (prompt §6.4–6.5, §20):
 * registry → argument validatsiyasi → ruxsat siyosati → (kerak bo'lsa) UI tasdig'i → bajarish → natijani tekshirish → audit.
 */
export class ToolExecutor {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly broker: ConfirmationBroker,
    private readonly audit: AuditRepository,
    private readonly logger: Logger,
  ) {}

  async execute(call: ToolCall, ctx: ExecuteContext): Promise<ToolOutput> {
    const tool = this.registry.get(call.name);
    if (!tool) {
      this.logger.warn('tool.unknown', { name: call.name });
      return {
        ok: false,
        verified: null,
        errorCode: 'UNKNOWN_TOOL',
        message: `“${call.name}” degan vosita mavjud emas.`,
      };
    }
    const parsed = tool.input.safeParse(call.args ?? {});
    if (!parsed.success) {
      this.logger.warn('tool.invalid_args', {
        tool: tool.id,
        issues: parsed.error.issues.map((i) => i.message),
      });
      return {
        ok: false,
        verified: null,
        errorCode: 'INVALID_ARGS',
        message: `Noto‘g‘ri parametrlar: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      };
    }
    const input = parsed.data;
    const needsConfirmation = ctx.source === 'ai' && tool.confirmation === 'always';
    const auditId = this.audit.start({
      toolId: tool.id,
      title: tool.title,
      summary: tool.summarize(input),
      permissionLevel: tool.permissionLevel,
      source: ctx.source,
      confirmation:
        ctx.source === 'user' ? 'user_initiated' : needsConfirmation ? 'not_required' : 'not_required',
      status: 'running',
      conversationId: ctx.conversationId,
      messageId: ctx.messageId,
    });
    const notify = () => {
      const a = this.audit.get(auditId);
      if (a) ctx.onActivity?.(a);
    };
    notify();
    const started = Date.now();

    const finish = (output: ToolOutput, statusOverride?: ToolActivity['status']) => {
      const status =
        statusOverride ?? (output.ok ? (output.verified === false ? 'unverified' : 'success') : 'error');
      this.audit.update(auditId, {
        status,
        resultMessage: output.message,
        errorCode: output.errorCode ?? null,
        durationMs: Date.now() - started,
        finished: true,
      });
      notify();
      this.logger.info('tool.finished', { tool: tool.id, status, ms: Date.now() - started });
      return output;
    };

    try {
      const prepared = await withTimeout(tool.prepare(input), tool.timeoutMs, ctx.signal);
      if (prepared.kind === 'done') return finish(prepared.output);

      if (needsConfirmation) {
        this.audit.update(auditId, { status: 'awaiting_confirmation' });
        notify();
        const answer = await this.broker.request(tool.id, tool.permissionLevel, prepared.confirm, ctx.signal);
        this.audit.update(auditId, {
          confirmation: answer === 'approved' ? 'approved' : answer,
          status: 'running',
        });
        if (answer !== 'approved') {
          return finish(
            {
              ok: false,
              verified: null,
              errorCode: answer === 'timeout' ? 'CONFIRMATION_TIMEOUT' : 'USER_DENIED',
              message:
                answer === 'timeout'
                  ? 'Tasdiq kutish vaqti tugadi, amal bajarilmadi.'
                  : 'Foydalanuvchi amalni bekor qildi, hech narsa o‘zgarmadi.',
            },
            'denied',
          );
        }
        notify();
      }

      const output = await withTimeout(prepared.run(ctx.signal), tool.timeoutMs, ctx.signal);
      return finish(output);
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'UNEXPECTED';
      this.logger.warn('tool.failed', { tool: tool.id, code, error });
      return finish({
        ok: false,
        verified: null,
        errorCode: code,
        message: error instanceof AppError ? error.message : ErrorCodes.UNEXPECTED,
      });
    }
  }
}
