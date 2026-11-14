import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfirmationRequest, ProcessEntry } from '@shared/ipc';
import { AuditRepository } from '../../src/main/database/audit-repository';
import { ConfirmationBroker } from '../../src/main/tools/confirmation';
import { ToolExecutor } from '../../src/main/tools/executor';
import { ToolRegistry } from '../../src/main/tools/registry';
import { createProcessTools } from '../../src/main/tools/process-tools';
import { createFakeAdapter } from '../../src/main/windows/fake-adapter';
import { groupProcesses, isProtectedProcess, matchProcess } from '../../src/main/windows/processes';
import { closeScript, parseProcesses, runningPidsScript } from '../../src/main/windows/windows-adapter';
import { tempDatabase } from './helpers/db';

const MB = 1024 * 1024;
const p = (pid: number, name: string, mem: number, extra: Partial<ProcessEntry> = {}): ProcessEntry => ({
  pid,
  name,
  memoryBytes: mem * MB,
  cpuPercent: 1,
  sessionId: 1,
  title: '',
  ...extra,
});

describe('jarayonlarni guruhlash va himoya', () => {
  const list = [
    p(1, 'chrome', 300, { cpuPercent: 10, title: 'YouTube - Google Chrome' }),
    p(2, 'chrome', 200, { cpuPercent: 2.5 }),
    p(3, 'Code', 400, { cpuPercent: 0.5, title: 'marius' }),
    p(4, 'svchost', 50, { sessionId: 0 }),
    p(5, 'explorer', 100, { title: 'Downloads' }),
    p(6, 'MARIUS', 150),
    p(7, 'game', 10, { cpuPercent: null }),
  ];

  it('bir nomdagi jarayonlar bitta qatorda, RAM bo‘yicha saralangan', () => {
    const g = groupProcesses(list, new Set());
    expect(g.map((x) => x.name)).toEqual(['chrome', 'Code', 'MARIUS', 'explorer', 'svchost', 'game']);
    expect(g[0]).toMatchObject({ count: 2, memoryBytes: 500 * MB, cpuPercent: 12.5, hasWindow: true });
    expect(g.find((x) => x.name === 'game')!.cpuPercent).toBeNull();
  });

  it('CPU bo‘yicha saralash', () => {
    expect(groupProcesses(list, new Set(), 'cpu')[0]!.name).toBe('chrome');
    expect(groupProcesses(list, new Set(), 'cpu').at(-1)!.name).toBe('game');
  });

  it('tizim jarayonlari, Windows xizmatlari va MARIUS himoyalangan', () => {
    const g = Object.fromEntries(groupProcesses(list, new Set([3])).map((x) => [x.name, x.protected]));
    expect(g).toMatchObject({
      svchost: true,
      explorer: true,
      MARIUS: true,
      Code: true,
      chrome: false,
      game: false,
    });
    expect(isProtectedProcess({ name: 'csrss.exe', sessionId: 1, pid: 9 }, new Set())).toBe(true);
    expect(isProtectedProcess({ name: 'notepad', sessionId: 0, pid: 9 }, new Set())).toBe(true);
  });

  it('nom bo‘yicha topish: aniq nom, .exe, oyna sarlavhasi, noaniqlik, himoya', () => {
    const own = new Set<number>();
    expect(matchProcess('Chrome.exe', list, own)).toMatchObject({
      kind: 'found',
      name: 'chrome',
      pids: [1, 2],
    });
    expect(matchProcess('Google Chrome', list, own)).toMatchObject({ kind: 'found', name: 'chrome' });
    expect(matchProcess('explorer', list, own)).toEqual({ kind: 'protected', name: 'explorer' });
    expect(matchProcess('telegram', list, own)).toEqual({ kind: 'not_found' });
    expect(matchProcess('c', [p(1, 'calc', 1), p(2, 'chrome', 1)], own).kind).toBe('not_found');
    expect(matchProcess('chro', [p(1, 'chrome', 1), p(2, 'chromedriver', 1)], own)).toMatchObject({
      kind: 'ambiguous',
      candidates: ['chrome', 'chromedriver'],
    });
  });
});

describe('Windows skriptlari', () => {
  it('PowerShell natijasi tahlil qilinadi, noto‘g‘ri qatorlar tashlanadi', () => {
    const out = JSON.stringify([
      { Id: 10, Name: 'chrome', Mem: 1000, Cpu: 1.5, Session: 1, Title: 'X' },
      { Id: 0, Name: 'Idle', Mem: 8, Cpu: null, Session: 0, Title: '' },
      { Id: 11, Name: 'secure', Mem: null, Cpu: null, Session: 0, Title: null },
    ]);
    expect(parseProcesses(out)).toEqual([
      { pid: 10, name: 'chrome', memoryBytes: 1000, cpuPercent: 1.5, sessionId: 1, title: 'X' },
      { pid: 11, name: 'secure', memoryBytes: 0, cpuPercent: null, sessionId: 0, title: '' },
    ]);
  });

  it('skriptga faqat butun sonli PID qo‘shiladi', () => {
    expect(closeScript([1, 22], false)).toContain('@(1,22)');
    expect(closeScript([1, 22], false)).toContain('CloseMainWindow');
    expect(closeScript([5], true)).toBe('Stop-Process -Id 5 -Force -ErrorAction SilentlyContinue');
    expect(runningPidsScript([7, 8])).toContain('-Id 7,8 ');
    expect(() => closeScript([1.5], true)).toThrow();
    expect(() => closeScript([-1], true)).toThrow();
    expect(() => closeScript(['1; Remove-Item C:\\' as unknown as number], true)).toThrow();
    expect(() => closeScript([], true)).toThrow();
  });
});

describe('close_app va list_processes vositalari', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let cleanup: (() => void) | undefined;
  afterEach(() => cleanup?.());

  function setup(answer: boolean) {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const os = createFakeAdapter();
    const requests: ConfirmationRequest[] = [];
    const ref: { b?: ConfirmationBroker } = {};
    const broker = new ConfirmationBroker((r) => {
      requests.push(r);
      queueMicrotask(() => ref.b!.respond(r.id, answer));
    }, 1000);
    ref.b = broker;
    const registry = new ToolRegistry();
    for (const tool of createProcessTools({ os, ownPids: () => new Set([9_700_100]), verifyWaitMs: 100 }))
      registry.register(tool);
    const executor = new ToolExecutor(registry, broker, new AuditRepository(t.db), logger);
    const run = (name: string, args: Record<string, unknown>, source: 'ai' | 'user' = 'ai') =>
      executor.execute(
        { id: 'x', name, args },
        { source, conversationId: null, messageId: null, signal: new AbortController().signal },
      );
    const alive = async (name: string) => (await os.listProcesses()).some((x) => x.name === name);
    return { run, requests, alive };
  }

  it('ro‘yxat tasdiqsiz, RAM bo‘yicha, ishonchsiz matn sifatida', async () => {
    const s = setup(true);
    const out = await s.run('list_processes', { limit: 3 });
    expect(out.ok).toBe(true);
    expect(s.requests).toHaveLength(0);
    const data = out.data as { untrustedExternalText: boolean; programs: { name: string; ram: string }[] };
    expect(data.untrustedExternalText).toBe(true);
    expect(data.programs.map((x) => x.name)).toEqual(['chrome', 'Telegram', 'explorer']);
    expect(data.programs[0]!.ram).toBe('1.1 GB');
  });

  it('tasdiqdan keyin dastur yopiladi va bu tekshiriladi', async () => {
    const s = setup(true);
    const out = await s.run('close_app', { name: 'Google Chrome' });
    expect(out).toMatchObject({ ok: true, verified: true, message: 'chrome yopildi.' });
    expect(s.requests[0]).toMatchObject({ action: 'Dasturni yopish', permissionLevel: 3 });
    expect(s.requests[0]!.target).toContain('3 ta jarayon');
    expect(await s.alive('chrome')).toBe(false);
  });

  it('rad etilsa yopilmaydi; foydalanuvchi o‘zi bossa ham tasdiq so‘raladi', async () => {
    const s = setup(false);
    expect((await s.run('close_app', { name: 'chrome' }, 'user')).errorCode).toBe('USER_DENIED');
    expect(s.requests).toHaveLength(1);
    expect(await s.alive('chrome')).toBe(true);
  });

  it('tizim jarayoni va MARIUS yopilmaydi (tasdiq ham so‘ralmaydi)', async () => {
    const s = setup(true);
    for (const name of ['svchost', 'explorer', 'System', 'Telegram']) {
      expect((await s.run('close_app', { name, force: true })).errorCode).toBe('PROTECTED_PROCESS');
    }
    expect(s.requests).toHaveLength(0);
    expect(await s.alive('explorer')).toBe(true);
  });

  it('oynasiz dastur oddiy usulda yopilmaydi, majburan yopish ogohlantirish bilan ishlaydi', async () => {
    const s = setup(true);
    const soft = await s.run('close_app', { name: 'FakeSync' });
    expect(soft.errorCode).toBe('NO_WINDOW');
    expect(soft.message).toMatch(/majburan/);
    const hard = await s.run('close_app', { name: 'FakeSync', force: true });
    expect(hard).toMatchObject({ ok: true, verified: true });
    expect(s.requests[0]).toMatchObject({ action: 'Dasturni MAJBURAN yopish' });
    expect(s.requests[0]!.effect).toMatch(/YO‘QOLADI/);
    expect(await s.alive('FakeSync')).toBe(false);
  });

  it('topilmagan dastur', async () => {
    const s = setup(true);
    expect((await s.run('close_app', { name: 'photoshop' })).errorCode).toBe('APP_NOT_RUNNING');
  });
});
