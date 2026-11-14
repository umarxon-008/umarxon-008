import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AuditRepository } from '../../src/main/database/audit-repository';
import { ConfirmationBroker } from '../../src/main/tools/confirmation';
import { ToolExecutor } from '../../src/main/tools/executor';
import { ToolRegistry } from '../../src/main/tools/registry';
import { AppCatalog, createComputerTools, launchAndVerify } from '../../src/main/tools/computer-tools';
import { createFakeAdapter, createUnsupportedAdapter } from '../../src/main/windows/fake-adapter';
import type { ToolManifest } from '../../src/main/tools/types';
import type { ConfirmationRequest } from '@shared/ipc';
import { tempDatabase } from './helpers/db';

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
let cleanup: (() => void) | undefined;
afterEach(() => cleanup?.());

function setup(opts: { autoAnswer?: boolean | 'never'; timeoutMs?: number } = {}) {
  const t = tempDatabase();
  cleanup = t.cleanup;
  const audit = new AuditRepository(t.db);
  const requests: ConfirmationRequest[] = [];
  const ref: { broker?: ConfirmationBroker } = {};
  const broker = new ConfirmationBroker((r) => {
    requests.push(r);
    if (opts.autoAnswer !== undefined && opts.autoAnswer !== 'never') {
      queueMicrotask(() => ref.broker!.respond(r.id, opts.autoAnswer as boolean));
    }
  }, opts.timeoutMs ?? 1000);
  ref.broker = broker;
  const os = createFakeAdapter();
  const registry = new ToolRegistry();
  for (const tool of createComputerTools({ os, catalog: new AppCatalog(os), isOnline: () => true }))
    registry.register(tool);
  const executor = new ToolExecutor(registry, broker, audit, logger);
  const ctx = (source: 'ai' | 'user' = 'ai') => ({
    source,
    conversationId: null,
    messageId: null,
    signal: new AbortController().signal,
  });
  return { audit, requests, broker, os, registry, executor, ctx, db: t.db };
}

describe('ToolRegistry', () => {
  it('LEVEL 4, noto‘g‘ri id va dublikatlar ro‘yxatdan o‘tmaydi', () => {
    const r = new ToolRegistry();
    const base: ToolManifest<Record<string, never>> = {
      id: 'ok_tool',
      version: '1',
      title: 't',
      description: 'd',
      permissionLevel: 0,
      confirmation: 'never',
      input: z.object({}).strict(),
      timeoutMs: 100,
      summarize: () => 's',
      prepare: async () => ({ kind: 'done', output: { ok: true, verified: null, message: '' } }),
    };
    r.register(base);
    expect(() => r.register(base)).toThrow(/takrorlangan/);
    expect(() => r.register({ ...base, id: 'Shell Exec!' })).toThrow();
    expect(() => r.register({ ...base, id: 'run_shell', permissionLevel: 4 as never })).toThrow(/LEVEL 4/);
  });

  it('model uchun e’lonlar: JSON Schema, shell yoki fayl o‘chirish vositasi yo‘q', () => {
    const { registry } = setup();
    const decls = registry.declarations();
    expect(decls.map((d) => d.name).sort()).toEqual([
      'focus_window',
      'get_battery_status',
      'get_disk_usage',
      'get_system_info',
      'launch_app',
      'list_installed_apps',
      'list_open_windows',
      'media_control',
    ]);
    const launch = decls.find((d) => d.name === 'launch_app')!;
    expect(launch.parameters).toMatchObject({ type: 'object', properties: { name: { type: 'string' } } });
    expect(launch.parameters).not.toHaveProperty('$schema');
  });
});

describe('ToolExecutor: xavfsizlik siyosati', () => {
  it('noma’lum vosita rad etiladi', async () => {
    const { executor, ctx, os } = setup();
    const out = await executor.execute({ id: '1', name: 'run_shell', args: { cmd: 'del C:\\' } }, ctx());
    expect(out).toMatchObject({ ok: false, errorCode: 'UNKNOWN_TOOL' });
    expect(os.launched).toEqual([]);
  });

  it('noto‘g‘ri argumentlar rad etiladi (ortiqcha maydon ham)', async () => {
    const { executor, ctx } = setup();
    expect(
      await executor.execute({ id: '1', name: 'focus_window', args: { pid: 'abc' } }, ctx()),
    ).toMatchObject({
      ok: false,
      errorCode: 'INVALID_ARGS',
    });
    expect(
      await executor.execute(
        { id: '1', name: 'launch_app', args: { name: 'Calculator', exe: 'C:\\evil.exe' } },
        ctx(),
      ),
    ).toMatchObject({ ok: false, errorCode: 'INVALID_ARGS' });
  });

  it('AI chaqirgan dastur ochish: foydalanuvchi rad etsa HECH NARSA ochilmaydi', async () => {
    const { executor, ctx, os, requests, audit } = setup({ autoAnswer: false });
    const out = await executor.execute({ id: '1', name: 'launch_app', args: { name: 'Calculator' } }, ctx());
    expect(out).toMatchObject({ ok: false, errorCode: 'USER_DENIED' });
    expect(os.launched).toEqual([]);
    expect(requests[0]).toMatchObject({
      action: 'Dasturni ochish',
      target: 'Calculator',
      permissionLevel: 2,
    });
    expect(audit.list(5)[0]).toMatchObject({
      toolId: 'launch_app',
      confirmation: 'denied',
      status: 'denied',
      source: 'ai',
    });
  });

  it('tasdiqlansa bir marta ochiladi va natija tekshiriladi', async () => {
    const { executor, ctx, os, audit } = setup({ autoAnswer: true });
    const out = await executor.execute(
      { id: '1', name: 'launch_app', args: { name: 'kalkulyatorni' } },
      ctx(),
    );
    expect(out).toMatchObject({ ok: true, verified: true, message: 'Calculator ochildi.' });
    expect(os.launched).toEqual(['Calculator']);
    expect(audit.list(5)[0]).toMatchObject({ confirmation: 'approved', status: 'success' });
  });

  it('tasdiq bir martalik: ikkinchi amal yana tasdiq so‘raydi', async () => {
    const { executor, ctx, requests } = setup({ autoAnswer: true });
    await executor.execute({ id: '1', name: 'launch_app', args: { name: 'Calculator' } }, ctx());
    await executor.execute({ id: '2', name: 'launch_app', args: { name: 'Notepad' } }, ctx());
    expect(requests).toHaveLength(2);
  });

  it('tasdiq vaqti tugasa amal bajarilmaydi', async () => {
    const { executor, ctx, os, audit } = setup({ autoAnswer: 'never', timeoutMs: 50 });
    const out = await executor.execute({ id: '1', name: 'launch_app', args: { name: 'Calculator' } }, ctx());
    expect(out).toMatchObject({ ok: false, errorCode: 'CONFIRMATION_TIMEOUT' });
    expect(os.launched).toEqual([]);
    expect(audit.list(1)[0]!.confirmation).toBe('timeout');
  });

  it('bir nechta mos dastur → hech narsa ochilmaydi, tanlash so‘raladi', async () => {
    const { executor, ctx, os, requests } = setup({ autoAnswer: true });
    const out = await executor.execute({ id: '1', name: 'launch_app', args: { name: 'microsoft' } }, ctx());
    expect(['AMBIGUOUS', 'APP_NOT_FOUND']).toContain(out.errorCode);
    expect(os.launched).toEqual([]);
    expect(requests).toHaveLength(0);
  });

  it('o‘qish amallari (LEVEL 0–1) tasdiqsiz bajariladi', async () => {
    const { executor, ctx, requests } = setup();
    expect(await executor.execute({ id: '1', name: 'get_system_info', args: {} }, ctx())).toMatchObject({
      ok: true,
    });
    const apps = await executor.execute(
      { id: '2', name: 'list_installed_apps', args: { query: 'calc' } },
      ctx(),
    );
    expect(apps.data).toMatchObject({ apps: ['Calculator'] });
    expect(requests).toHaveLength(0);
  });

  it('foydalanuvchi o‘zi UI’da bosgan amal: tasdiq oynasi chiqmaydi, “user_initiated” deb yoziladi', async () => {
    const { executor, ctx, requests, audit, os } = setup();
    const out = await executor.execute(
      { id: '1', name: 'launch_app', args: { appId: 'Microsoft.WindowsNotepad_8wekyb3d8bbwe!App' } },
      ctx('user'),
    );
    expect(out.ok).toBe(true);
    expect(requests).toHaveLength(0);
    expect(os.launched).toEqual(['Notepad']);
    expect(audit.list(1)[0]).toMatchObject({ source: 'user', confirmation: 'user_initiated' });
  });

  it('ro‘yxatda yo‘q appId bilan hech narsa ochilmaydi', async () => {
    const { executor, ctx, os } = setup();
    const out = await executor.execute(
      { id: '1', name: 'launch_app', args: { appId: 'C:\\Windows\\evil.exe' } },
      ctx('user'),
    );
    expect(out).toMatchObject({ ok: false, errorCode: 'APP_NOT_FOUND' });
    expect(os.launched).toEqual([]);
  });

  it('crash’dan keyin yarim qolgan amal “unknown” bo‘ladi', () => {
    const { audit } = setup();
    audit.start({
      toolId: 'launch_app',
      title: 'Dastur ochish',
      summary: 's',
      permissionLevel: 2,
      source: 'ai',
      confirmation: 'approved',
      status: 'running',
      conversationId: null,
      messageId: null,
    });
    expect(audit.recoverInterrupted()).toBe(1);
    expect(audit.list(1)[0]).toMatchObject({ status: 'unknown', errorCode: 'INTERRUPTED' });
  });

  it('Windows bo‘lmagan tizimda tushunarli xato', async () => {
    const t = tempDatabase();
    cleanup = t.cleanup;
    const os = createUnsupportedAdapter();
    const registry = new ToolRegistry();
    for (const tool of createComputerTools({ os, catalog: new AppCatalog(os), isOnline: () => true }))
      registry.register(tool);
    const executor = new ToolExecutor(
      registry,
      new ConfirmationBroker(() => undefined),
      new AuditRepository(t.db),
      logger,
    );
    const out = await executor.execute(
      { id: '1', name: 'list_open_windows', args: {} },
      { source: 'ai', conversationId: null, messageId: null, signal: new AbortController().signal },
    );
    expect(out).toMatchObject({
      ok: false,
      errorCode: 'OS_UNSUPPORTED',
      message: expect.stringMatching(/Windows/),
    });
  });
});

describe('natijani tekshirish (§6.5)', () => {
  it('oyna paydo bo‘lmasa “tekshirib bo‘lmadi” deyiladi, “ochildi” emas', async () => {
    const os = createFakeAdapter();
    os.launchApp = async () => undefined; // oyna paydo bo'lmaydi
    const out = await launchAndVerify(os, { id: 'x', name: 'Calculator' }, new AbortController().signal, 600);
    expect(out).toMatchObject({ ok: true, verified: false });
    expect(out.message).toMatch(/tekshirib bo‘lmadi/);
  });
});

describe('ConfirmationBroker', () => {
  it('noma’lum yoki ikkinchi marta javob qabul qilinmaydi', async () => {
    const broker = new ConfirmationBroker(() => undefined);
    expect(broker.respond('00000000-0000-4000-8000-000000000000', true)).toBe(false);
    const p = broker.request('launch_app', 2, { action: 'a', target: 't', effect: 'e' });
    const id = broker.pendingRequests()[0]!.id;
    expect(broker.respond(id, true)).toBe(true);
    expect(broker.respond(id, false)).toBe(false);
    expect(await p).toBe('approved');
  });
});
