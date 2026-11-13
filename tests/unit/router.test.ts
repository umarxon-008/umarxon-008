import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/ipc';
import { AppError, createSenderGuard, dispatchIpc, type IpcHandlers } from '../../src/main/ipc/router';
import type { Logger } from '../../src/main/logging/logger';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const trusted = () => true;

function makeHandlers(overrides: Partial<IpcHandlers> = {}): IpcHandlers {
  return {
    'app:getInfo': () => ({
      name: 'MARIUS',
      version: '0.0.0',
      platform: 'test',
      electron: '0',
      dataDirectory: '/d',
      databaseFile: '/d/marius.db',
      logDirectory: '/d/logs',
    }),
    'system:getMetrics': () => ({
      cpu: { percent: 10, cores: 4 },
      memory: { totalBytes: 100, usedBytes: 40, percent: 40 },
      disk: null,
      online: true,
      os: { name: 'Test OS', release: '1', uptimeSeconds: 5 },
      sampledAt: new Date(0).toISOString(),
    }),
    'settings:getAll': () => DEFAULT_SETTINGS,
    'settings:update': (patch) => ({ ...DEFAULT_SETTINGS, ...patch }),
    'logs:openFolder': () => undefined,
    ...overrides,
  };
}

describe('dispatchIpc', () => {
  it('noma’lum kanalni rad etadi', async () => {
    const r = await dispatchIpc('shell:exec', 'rm -rf /', 'app://x', makeHandlers(), trusted, logger);
    expect(r).toMatchObject({ ok: false, error: { code: 'UNKNOWN_CHANNEL' } });
  });

  it('ishonchsiz jo‘natuvchini rad etadi', async () => {
    const r = await dispatchIpc(
      'settings:getAll',
      undefined,
      'https://evil.example',
      makeHandlers(),
      () => false,
      logger,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN_SENDER' } });
  });

  it('noto‘g‘ri kirish ma’lumotini handlerga yetkazmaydi', async () => {
    const update = vi.fn();
    const r = await dispatchIpc(
      'settings:update',
      { theme: 'neon', extra: 1 },
      'x',
      makeHandlers({ 'settings:update': update }),
      trusted,
      logger,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(update).not.toHaveBeenCalled();
  });

  it('input kutilmagan kanalga argument yuborilsa rad etadi', async () => {
    const r = await dispatchIpc('settings:getAll', { a: 1 }, 'x', makeHandlers(), trusted, logger);
    expect(r).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('to‘g‘ri so‘rovni bajaradi', async () => {
    const r = await dispatchIpc('settings:update', { theme: 'light' }, 'x', makeHandlers(), trusted, logger);
    expect(r).toEqual({ ok: true, data: { ...DEFAULT_SETTINGS, theme: 'light' } });
  });

  it('handler xatosini o‘zbekcha xabarga aylantiradi va stack’ni oshkor qilmaydi', async () => {
    const r = await dispatchIpc(
      'settings:getAll',
      undefined,
      'x',
      makeHandlers({
        'settings:getAll': () => {
          throw new Error('SQLITE_CORRUPT at /secret/path');
        },
      }),
      trusted,
      logger,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'UNEXPECTED' } });
    expect(JSON.stringify(r)).not.toContain('/secret/path');
  });

  it('AppError kodini saqlaydi', async () => {
    const r = await dispatchIpc(
      'settings:getAll',
      undefined,
      'x',
      makeHandlers({
        'settings:getAll': () => {
          throw new AppError('DATABASE_ERROR');
        },
      }),
      trusted,
      logger,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'DATABASE_ERROR' } });
  });

  it('handler noto‘g‘ri shakldagi natija qaytarsa, uni yubormaydi', async () => {
    const r = await dispatchIpc(
      'settings:getAll',
      undefined,
      'x',
      makeHandlers({ 'settings:getAll': () => ({ theme: 'dark' }) as never }),
      trusted,
      logger,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'UNEXPECTED' } });
  });
});

describe('createSenderGuard', () => {
  it('dev server origin’iga ruxsat beradi', () => {
    const guard = createSenderGuard({
      devServerUrl: 'http://localhost:5173',
      rendererFile: '/app/out/renderer/index.html',
    });
    expect(guard('http://localhost:5173/#/settings')).toBe(true);
    expect(guard('http://localhost:5174/')).toBe(false);
    expect(guard('https://example.com')).toBe(false);
  });

  it('faqat ilovaning o‘z index.html fayliga ruxsat beradi', () => {
    // Yo'llar platformaga mos quriladi: Windows'da "D:\app\...", Linux'da "/app/...".
    const rendererFile = resolve('/app/out/renderer/index.html');
    const appUrl = pathToFileURL(rendererFile).href;
    const guard = createSenderGuard({ rendererFile });
    expect(guard(appUrl)).toBe(true);
    expect(guard(`${appUrl}#/settings`)).toBe(true);
    expect(guard(pathToFileURL(resolve('/tmp/evil.html')).href)).toBe(false);
    expect(guard(pathToFileURL(resolve('/app/out/renderer/other.html')).href)).toBe(false);
    expect(guard('http://localhost:5173/')).toBe(false);
    expect(guard('not a url')).toBe(false);
  });
});
