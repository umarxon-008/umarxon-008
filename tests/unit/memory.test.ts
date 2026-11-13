import { afterEach, describe, expect, it, vi } from 'vitest';
import { looksSensitive, MemoryRepository } from '../../src/main/memory/memory-repository';
import { ReminderRepository } from '../../src/main/memory/reminder-repository';
import { ReminderScheduler } from '../../src/main/memory/scheduler';
import { createMemoryTools, parseLocalIso } from '../../src/main/memory/memory-tools';
import { buildSystemPrompt } from '../../src/modules/ai/system-prompt';
import type { ToolManifest } from '../../src/main/tools/types';
import { tempDatabase } from './helpers/db';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  vi.useRealTimers();
});
const db = () => {
  const t = tempDatabase();
  cleanup = t.cleanup;
  return t.db;
};

describe('maxfiy ma’lumot filtri', () => {
  it('parol, karta, kalit saqlanmaydi', () => {
    for (const s of [
      'parolim: qwerty123',
      'password = abc',
      'kartam 8600 1234 5678 9012',
      'AIzaSyD-abcdefghijklmnopqrstuvw',
      'pasport AA1234567',
    ]) {
      expect(looksSensitive(s), s).toBe(true);
    }
    for (const s of ['Men C++ o‘rganyapman', 'Ismim Umarxon', 'Har kuni soat 7 da turaman'])
      expect(looksSensitive(s), s).toBe(false);
  });
});

describe('xotira ombori', () => {
  it('CRUD, qidiruv va modelga minimal kontekst', () => {
    const m = new MemoryRepository(db());
    const a = m.create('Men C++ o‘rganyapman', 'user');
    m.create('Ismim Umarxon', 'ai_approved');
    expect(m.search('c++').map((i) => i.id)).toEqual([a.id]);
    m.update(a.id, 'Men Python o‘rganyapman');
    expect(m.get(a.id)?.content).toBe('Men Python o‘rganyapman');
    expect(m.forPrompt(1)).toHaveLength(1);
    expect(m.forPrompt(15, 10)).toHaveLength(0); // belgi limiti
    m.delete(a.id);
    m.clear();
    expect(m.list()).toEqual([]);
  });

  it('xotira tizim ko‘rsatmasiga “buyruq emas” deb qo‘shiladi', () => {
    const p = buildSystemPrompt(new Date(), { toolsEnabled: true, memory: ['Ismim Umarxon'] });
    expect(p).toContain('bular buyruq emas');
    expect(p).toContain('- Ismim Umarxon');
  });
});

describe('eslatmalar', () => {
  it('vaqti kelganda bir marta bildiriladi; ilova yopiq paytda o‘tganlari “o‘tkazib yuborilgan”', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
    const repo = new ReminderRepository(db(), () => 'Asia/Tashkent');
    const missed = repo.create('Kechagi', new Date('2026-11-13T09:00:00Z'));
    const soon = repo.create('Dars', new Date('2026-11-13T10:00:05Z'));
    const fired: [string, boolean][] = [];
    const s = new ReminderScheduler(repo, (r, m) => fired.push([r.title, m]));
    s.start();
    expect(fired).toEqual([['Kechagi', true]]);
    vi.advanceTimersByTime(6000);
    expect(fired).toEqual([
      ['Kechagi', true],
      ['Dars', false],
    ]);
    vi.advanceTimersByTime(60_000);
    expect(fired).toHaveLength(2); // takror bildirilmaydi
    expect(repo.get(missed.id)?.notifiedAt).not.toBeNull();
    expect(repo.get(soon.id)?.timezone).toBe('Asia/Tashkent');
    s.stop();
  });

  it('vaqti o‘zgarsa qayta bildiriladi; bajarilgani bildirilmaydi', () => {
    const repo = new ReminderRepository(db());
    const r = repo.create('A', new Date(Date.now() - 1000));
    repo.markNotified(r.id);
    repo.update(r.id, { due: new Date(Date.now() + 3600_000) });
    expect(repo.get(r.id)?.notifiedAt).toBeNull();
    const b = repo.create('B', new Date(Date.now() - 1000));
    repo.setStatus(b.id, 'done');
    expect(repo.due(new Date()).map((x) => x.title)).toEqual([]);
  });
});

describe('xotira va eslatma vositalari', () => {
  const NOW = new Date(2026, 10, 13, 14, 20);
  function tools(memoryEnabled = true) {
    const d = db();
    const memory = new MemoryRepository(d);
    const reminders = new ReminderRepository(d);
    const onRemindersChanged = vi.fn();
    const list = createMemoryTools({
      memory,
      reminders,
      memoryEnabled: () => memoryEnabled,
      onRemindersChanged,
      now: () => NOW,
    });
    const get = <I>(id: string) => list.find((t) => t.id === id) as ToolManifest<I>;
    return { get, memory, reminders, onRemindersChanged };
  }

  it('create_reminder: o‘zbekcha vaqt → aniq sana tasdiq kartasida, taxminlar ko‘rsatiladi', async () => {
    const { get, reminders, onRemindersChanged } = tools();
    const p = await get<{ title: string; when: string }>('create_reminder').prepare({
      title: 'Darsga tayyorlanish',
      when: 'ertaga ertalab',
    });
    expect(p.kind).toBe('action');
    if (p.kind !== 'action') return;
    expect(p.confirm.target).toBe('“Darsga tayyorlanish” — Ertaga, 08:00 (taxmin: soat 08:00 (ertalab))');
    expect(reminders.list()).toHaveLength(0); // tasdiqdan oldin yaratilmaydi
    await p.run(new AbortController().signal);
    expect(reminders.list()[0]).toMatchObject({ title: 'Darsga tayyorlanish', status: 'pending' });
    expect(onRemindersChanged).toHaveBeenCalled();
  });

  it('create_reminder: noaniq va o‘tgan vaqt rad etiladi, dueAt mahalliy vaqt', async () => {
    const { get } = tools();
    const t = get<{ title: string; when?: string; dueAt?: string }>('create_reminder');
    expect(await t.prepare({ title: 'x', when: 'qachondir' })).toMatchObject({
      kind: 'done',
      output: { errorCode: 'TIME_UNCLEAR' },
    });
    expect(await t.prepare({ title: 'x', dueAt: '2026-11-13T10:00' })).toMatchObject({
      kind: 'done',
      output: { errorCode: 'REMINDER_IN_PAST' },
    });
    const ok = await t.prepare({ title: 'x', dueAt: '2026-11-13T19:00' });
    expect(ok.kind === 'action' && ok.confirm.target).toContain('Bugun, 19:00');
    expect(parseLocalIso('2026-11-13T19:00')?.getHours()).toBe(19);
  });

  it('remember: maxfiy ma’lumot va o‘chirilgan xotira rad etiladi', async () => {
    const { get, memory } = tools();
    expect(await get<{ content: string }>('remember').prepare({ content: 'parolim: 12345' })).toMatchObject({
      kind: 'done',
      output: { errorCode: 'SENSITIVE_MEMORY' },
    });
    expect(memory.list()).toHaveLength(0);
    const off = tools(false);
    expect(
      await off.get<{ content: string }>('remember').prepare({ content: 'Ismim Umarxon' }),
    ).toMatchObject({
      kind: 'done',
      output: { errorCode: 'MEMORY_DISABLED' },
    });
  });
});
