import { randomUUID } from 'node:crypto';
import type { ConfirmationRequest, PermissionLevel } from '@shared/ipc';
import type { ConfirmationCard } from './types';

export type ConfirmationAnswer = 'approved' | 'denied' | 'timeout';

/**
 * Foydalanuvchi tasdig'i (prompt §20.3, §20.4). Tasdiq faqat UI'dagi haqiqiy bosish orqali olinadi:
 * AI "foydalanuvchi ruxsat berdi" deb yozsa ham bu ruxsat hisoblanmaydi.
 * Tasdiq bir martalik: keyingi amallarga tatbiq qilinmaydi.
 */
export class ConfirmationBroker {
  private pending = new Map<
    string,
    {
      resolve: (a: ConfirmationAnswer) => void;
      timer: ReturnType<typeof setTimeout>;
      request: ConfirmationRequest;
    }
  >();

  constructor(
    private readonly emit: (request: ConfirmationRequest) => void,
    private readonly timeoutMs = 120_000,
  ) {}

  request(
    toolId: string,
    level: PermissionLevel,
    card: ConfirmationCard,
    signal?: AbortSignal,
  ): Promise<ConfirmationAnswer> {
    const id = randomUUID();
    const request: ConfirmationRequest = {
      id,
      toolId,
      action: card.action,
      target: card.target,
      effect: card.effect,
      permissionLevel: level,
      preview: card.preview ?? null,
      expiresAt: new Date(Date.now() + this.timeoutMs).toISOString(),
    };
    return new Promise((resolve) => {
      const finish = (answer: ConfirmationAnswer) => {
        const p = this.pending.get(id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(id);
        resolve(answer);
      };
      const timer = setTimeout(() => finish('timeout'), this.timeoutMs);
      this.pending.set(id, { resolve: finish, timer, request });
      signal?.addEventListener('abort', () => finish('denied'), { once: true });
      this.emit(request);
    });
  }

  /** UI javobi. Noma'lum yoki muddati o'tgan so'rov uchun false. */
  respond(id: string, approved: boolean): boolean {
    const p = this.pending.get(id);
    if (!p) return false;
    p.resolve(approved ? 'approved' : 'denied');
    return true;
  }

  pendingRequests(): ConfirmationRequest[] {
    return [...this.pending.values()].map((p) => p.request);
  }
}
