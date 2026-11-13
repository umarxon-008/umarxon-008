import type { Reminder } from '@shared/ipc';
import type { ReminderRepository } from './reminder-repository';

const MAX_DELAY = 6 * 60 * 60 * 1000; // setTimeout 24.8 kundan oshmasligi kerak; har 6 soatda qayta hisoblanadi

/**
 * Eslatmalar rejalashtiruvchisi (prompt §15). Polling yo'q: eng yaqin eslatma uchun bitta taymer.
 * Ilova yopiq bo'lgan paytda o'tib ketgan eslatmalar keyingi ishga tushishda "o'tkazib yuborilgan" deb bildiriladi.
 */
export class ReminderScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly repo: ReminderRepository,
    private readonly notify: (reminder: Reminder, missed: boolean) => void,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Ishga tushganda: o'tib ketganlar darhol, qolganlari taymer bilan */
  start(): void {
    this.fireDue(true);
    this.reschedule();
  }

  reschedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const next = this.repo.nextDue();
    if (!next) return;
    const delay = Math.max(0, Math.min(MAX_DELAY, new Date(next.dueAt).getTime() - this.now().getTime()));
    this.timer = setTimeout(() => {
      this.fireDue(false);
      this.reschedule();
    }, delay);
  }

  private fireDue(startup: boolean): void {
    const now = this.now();
    for (const r of this.repo.due(now)) {
      this.repo.markNotified(r.id);
      // 2 daqiqadan ko'proq kechikkan bo'lsa (ilova yopiq edi yoki kompyuter uxlagan) — "o'tkazib yuborilgan"
      const missed = startup || now.getTime() - new Date(r.dueAt).getTime() > 120_000;
      this.notify(r, missed);
    }
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
