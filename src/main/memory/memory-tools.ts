import { z } from 'zod';
import { MAX_MEMORY_LENGTH } from '@shared/ipc';
import { formatUzDateTime, parseUzbekDateTime } from '@shared/uz-time';
import type { ToolManifest, ToolOutput } from '../tools/types';
import { looksSensitive, type MemoryRepository } from './memory-repository';
import type { ReminderRepository } from './reminder-repository';

export interface MemoryToolDeps {
  memory: MemoryRepository;
  reminders: ReminderRepository;
  memoryEnabled: () => boolean;
  onRemindersChanged: () => void;
  now?: () => Date;
}

const done = (output: ToolOutput) => ({ kind: 'done' as const, output });
const fail = (errorCode: string, message: string): ToolOutput => ({
  ok: false,
  verified: null,
  errorCode,
  message,
});

/** "2026-11-14T19:00" (mahalliy) yoki to'liq ISO → Date */
export function parseLocalIso(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(v.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Xotira va eslatma vositalari (prompt §14, §15). Yozish amallari foydalanuvchi tasdig'i bilan. */
export function createMemoryTools(deps: MemoryToolDeps): ToolManifest<unknown>[] {
  const now = deps.now ?? (() => new Date());

  const remember: ToolManifest<{ content: string }> = {
    id: 'remember',
    version: '1.0.0',
    title: 'Eslab qolish',
    description:
      'Save a short fact or preference the user explicitly asked you to remember (e.g. "my name is Umarxon", "I study C++"). ' +
      'Never store passwords, card numbers or other secrets. Requires user confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ content: z.string().trim().min(1).max(MAX_MEMORY_LENGTH) }).strict(),
    timeoutMs: 150_000,
    summarize: () => 'Xotiraga yozish',
    async prepare(input) {
      if (!deps.memoryEnabled())
        return done(
          fail('MEMORY_DISABLED', 'Xotira o‘chirilgan. Foydalanuvchi uni Xotira bo‘limida yoqishi mumkin.'),
        );
      if (looksSensitive(input.content)) {
        return done(
          fail(
            'SENSITIVE_MEMORY',
            'Bu maxfiy ma’lumotga o‘xshaydi (parol, karta raqami, kalit). Xavfsizlik uchun saqlanmaydi.',
          ),
        );
      }
      return {
        kind: 'action',
        confirm: {
          action: 'Xotiraga yozish',
          target: `“${input.content}”`,
          effect:
            'Bu ma’lumot kompyuteringizda saqlanadi va keyingi suhbatlarda MARIUS’ga eslatiladi. Xotira bo‘limida o‘chirish mumkin.',
        },
        run: async () => {
          const item = deps.memory.create(input.content, 'ai_approved');
          return {
            ok: true,
            verified: Boolean(deps.memory.get(item.id)),
            message: 'Eslab qolindi.',
            data: { id: item.id },
          };
        },
      };
    },
  };

  const recall: ToolManifest<{ query?: string | undefined }> = {
    id: 'recall_memory',
    version: '1.0.0',
    title: 'Xotirani ko‘rish',
    description: 'Search facts the user approved to remember. Returns ids and contents.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z.object({ query: z.string().max(200).optional() }).strict(),
    timeoutMs: 5000,
    summarize: (i) => (i.query ? `Xotiradan qidirish: “${i.query}”` : 'Xotirani o‘qish'),
    async prepare(input) {
      if (!deps.memoryEnabled()) return done(fail('MEMORY_DISABLED', 'Xotira o‘chirilgan.'));
      const items = input.query ? deps.memory.search(input.query) : deps.memory.list().slice(0, 20);
      return done({
        ok: true,
        verified: null,
        message: `${items.length} ta yozuv.`,
        data: { items: items.map((i) => ({ id: i.id, content: i.content })) },
      });
    },
  };

  const forget: ToolManifest<{ id: string }> = {
    id: 'forget_memory',
    version: '1.0.0',
    title: 'Xotiradan o‘chirish',
    description: 'Delete one remembered fact by id (from recall_memory). Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ id: z.string().uuid() }).strict(),
    timeoutMs: 150_000,
    summarize: () => 'Xotiradan o‘chirish',
    async prepare(input) {
      const item = deps.memory.get(input.id);
      if (!item) return done(fail('NOT_FOUND', 'Bunday xotira yozuvi topilmadi.'));
      return {
        kind: 'action',
        confirm: {
          action: 'Xotiradan o‘chirish',
          target: `“${item.content}”`,
          effect: 'Bu yozuv butunlay o‘chiriladi.',
        },
        run: async () => {
          const ok = deps.memory.delete(item.id);
          return {
            ok,
            verified: ok && !deps.memory.get(item.id),
            message: ok ? 'Xotiradan o‘chirildi.' : 'O‘chirib bo‘lmadi.',
          };
        },
      };
    },
  };

  const createReminder: ToolManifest<{
    title: string;
    when?: string | undefined;
    dueAt?: string | undefined;
    description?: string | undefined;
  }> = {
    id: 'create_reminder',
    version: '1.0.0',
    title: 'Eslatma qo‘shish',
    description:
      'Create a reminder. Give either "when" as the user said it in Uzbek (e.g. "ertaga ertalab soat 8", "bugun 19:00", "2 soatdan keyin") ' +
      'or "dueAt" as local time "YYYY-MM-DDTHH:mm". The exact resolved date is shown to the user for confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z
      .object({
        title: z.string().trim().min(1).max(200),
        when: z.string().max(200).optional(),
        dueAt: z.string().max(40).optional(),
        description: z.string().max(1000).optional(),
      })
      .strict(),
    timeoutMs: 150_000,
    summarize: (i) => `Eslatma: ${i.title}`,
    async prepare(input) {
      const current = now();
      let due: Date | null = null;
      let assumed: string[] = [];
      if (input.dueAt) due = parseLocalIso(input.dueAt);
      if (!due && input.when) {
        const p = parseUzbekDateTime(input.when, current);
        if (p) {
          due = p.date;
          assumed = p.assumed;
        }
      }
      if (!due)
        return done(
          fail(
            'TIME_UNCLEAR',
            'Vaqt aniq emas. Foydalanuvchidan qaysi kun va soatda eslatish kerakligini so‘ra.',
          ),
        );
      if (due.getTime() <= current.getTime())
        return done(fail('REMINDER_IN_PAST', 'Bu vaqt o‘tib ketgan. Foydalanuvchidan boshqa vaqtni so‘ra.'));
      if (due.getTime() - current.getTime() > 2 * 365 * 86_400_000)
        return done(fail('TIME_UNCLEAR', 'Vaqt juda uzoq (2 yildan ortiq).'));
      const label = formatUzDateTime(due, current);
      const dueDate = due;
      return {
        kind: 'action',
        confirm: {
          action: 'Eslatma qo‘shish',
          target: `“${input.title}” — ${label}${assumed.length ? ` (taxmin: ${assumed.join(', ')})` : ''}`,
          effect:
            'Shu vaqtda Windows bildirishnomasi chiqadi. Buning uchun MARIUS ochiq yoki tray’da bo‘lishi kerak.',
        },
        run: async () => {
          const r = deps.reminders.create(input.title, dueDate, input.description);
          deps.onRemindersChanged();
          return {
            ok: true,
            verified: Boolean(deps.reminders.get(r.id)),
            message: `Eslatma qo‘shildi: ${label}.`,
            data: { id: r.id, when: label },
          };
        },
      };
    },
  };

  const listReminders: ToolManifest<{ includeDone?: boolean | undefined }> = {
    id: 'list_reminders',
    version: '1.0.0',
    title: 'Eslatmalar ro‘yxati',
    description: 'List the user’s reminders with ids, titles and local times. By default only pending ones.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z.object({ includeDone: z.boolean().optional() }).strict(),
    timeoutMs: 5000,
    summarize: () => 'Eslatmalarni o‘qish',
    async prepare(input) {
      const current = now();
      const items = deps.reminders.list().filter((r) => input.includeDone || r.status === 'pending');
      return done({
        ok: true,
        verified: null,
        message: items.length ? `${items.length} ta eslatma.` : 'Eslatmalar yo‘q.',
        data: {
          reminders: items.map((r) => ({
            id: r.id,
            title: r.title,
            when: formatUzDateTime(new Date(r.dueAt), current),
            status: r.status,
          })),
        },
      });
    },
  };

  const completeReminder: ToolManifest<{ id: string }> = {
    id: 'complete_reminder',
    version: '1.0.0',
    title: 'Eslatmani bajarildi deb belgilash',
    description: 'Mark a reminder as done by id (from list_reminders). Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ id: z.string().uuid() }).strict(),
    timeoutMs: 150_000,
    summarize: () => 'Eslatmani bajarildi deb belgilash',
    async prepare(input) {
      const r = deps.reminders.get(input.id);
      if (!r) return done(fail('NOT_FOUND', 'Bunday eslatma topilmadi.'));
      return {
        kind: 'action',
        confirm: {
          action: 'Bajarildi deb belgilash',
          target: `“${r.title}”`,
          effect: 'Eslatma ro‘yxatda “bajarildi” bo‘ladi va endi bildirilmaydi.',
        },
        run: async () => {
          deps.reminders.setStatus(r.id, 'done');
          deps.onRemindersChanged();
          return {
            ok: true,
            verified: deps.reminders.get(r.id)?.status === 'done',
            message: 'Eslatma bajarildi deb belgilandi.',
          };
        },
      };
    },
  };

  return [
    remember,
    recall,
    forget,
    createReminder,
    listReminders,
    completeReminder,
  ] as unknown as ToolManifest<unknown>[];
}
