import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  guardExisting,
  guardNew,
  isExecutable,
  isInside,
  validateFileName,
} from '../../src/main/files/path-guard';
import { searchFiles } from '../../src/main/files/file-search';
import { createFileTools } from '../../src/main/files/file-tools';
import { AuditRepository } from '../../src/main/database/audit-repository';
import { ConfirmationBroker } from '../../src/main/tools/confirmation';
import { ToolExecutor } from '../../src/main/tools/executor';
import { ToolRegistry } from '../../src/main/tools/registry';
import { tempDatabase } from './helpers/db';

let base: string;
let allowed: string;
let outside: string;

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'marius-files-'));
  allowed = join(base, 'Hujjatlar');
  outside = join(base, 'Maxfiy');
  mkdirSync(join(allowed, 'Dars'), { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(allowed, 'Dars', 'dars jadvali.pdf'), 'pdf');
  writeFileSync(join(allowed, 'Dars', 'eslatma.txt'), 'matn');
  writeFileSync(join(allowed, 'o‘zbekcha_hujjat.docx'), 'docx');
  writeFileSync(join(allowed, 'setup.exe'), 'MZ');
  writeFileSync(join(outside, 'parollar.txt'), 'SECRET');
  const old = new Date(Date.now() - 40 * 86_400_000);
  utimesSync(join(allowed, 'Dars', 'eslatma.txt'), old, old);
});

afterEach(() => rmSync(base, { recursive: true, force: true }));

describe('path guard', () => {
  it('ruxsatli papka ichidagi faylga ruxsat beradi', async () => {
    const r = await guardExisting(join(allowed, 'Dars', 'dars jadvali.pdf'), [allowed]);
    expect(r.ok).toBe(true);
  });

  it('“..” bilan tashqariga chiqish rad etiladi', async () => {
    const r = await guardExisting(join(allowed, '..', 'Maxfiy', 'parollar.txt'), [allowed]);
    expect(r).toEqual({ ok: false, reason: 'OUTSIDE_ALLOWED' });
  });

  it('symlink orqali tashqariga chiqish rad etiladi (realpath)', async () => {
    symlinkSync(outside, join(allowed, 'yorliq'), 'dir');
    expect(await guardExisting(join(allowed, 'yorliq', 'parollar.txt'), [allowed])).toEqual({
      ok: false,
      reason: 'OUTSIDE_ALLOWED',
    });
  });

  it('nisbiy, tarmoq va qurilma yo‘llari rad etiladi', async () => {
    expect((await guardExisting('Dars/eslatma.txt', [allowed])).ok).toBe(false);
    expect(await guardExisting('\\\\server\\share\\x.txt', [allowed])).toMatchObject({ reason: 'BAD_PATH' });
    expect(await guardExisting('\\\\?\\C:\\Windows', [allowed])).toMatchObject({ reason: 'BAD_PATH' });
    expect(await guardExisting(`${allowed}/a\0b`, [allowed])).toMatchObject({ reason: 'BAD_PATH' });
  });

  it('ruxsatli papka yo‘q bo‘lsa hech narsa ochilmaydi', async () => {
    expect(await guardExisting(join(allowed, 'setup.exe'), [])).toMatchObject({
      reason: 'NO_ALLOWED_FOLDERS',
    });
  });

  it('o‘xshash nomli qo‘shni papka ichida hisoblanmaydi', () => {
    expect(isInside('/home/u/Docs', '/home/u/Docs2/x')).toBe(false);
    expect(isInside('/home/u/Docs', '/home/u/Docs/x')).toBe(true);
  });

  it('yangi element nomi tekshiriladi', async () => {
    expect((await guardNew(allowed, 'Yangi papka', [allowed])).ok).toBe(true);
    expect(await guardNew(allowed, '../chiqish', [allowed])).toMatchObject({ reason: 'BAD_PATH' });
    expect(await guardNew(outside, 'x', [allowed])).toMatchObject({ reason: 'OUTSIDE_ALLOWED' });
  });

  it('Windows nom qoidalari', () => {
    expect(validateFileName('Hisobot 2026')).toBeNull();
    expect(validateFileName('O‘zbekcha nom')).toBeNull();
    for (const bad of [
      '',
      '..',
      'a/b',
      'a\\b',
      'a:b',
      'CON',
      'nul.txt',
      'com1',
      'nom.',
      'nom ',
      'a?b',
      'x'.repeat(201),
    ]) {
      expect(validateFileName(bad), bad).not.toBeNull();
    }
  });

  it('dastur/skript fayllari aniqlanadi', () => {
    for (const f of ['a.exe', 'b.BAT', 'c.ps1', 'd.lnk', 'e.vbs', 'f.msi', 'g.js'])
      expect(isExecutable(f), f).toBe(true);
    for (const f of ['a.pdf', 'b.docx', 'c.txt', 'papka']) expect(isExecutable(f), f).toBe(false);
  });
});

describe('fayl qidirish', () => {
  it('nom bo‘yicha (bo‘sh joy/pastki chiziq farqi yo‘q) va kengaytma bo‘yicha', async () => {
    const byName = await searchFiles({ roots: [allowed], query: 'dars jadvali' });
    expect(byName.results.map((r) => r.name)).toEqual(['dars jadvali.pdf']);
    const byExt = await searchFiles({ roots: [allowed], extension: 'PDF' });
    expect(byExt.results.map((r) => r.name)).toEqual(['dars jadvali.pdf']);
    const uz = await searchFiles({ roots: [allowed], query: "o'zbekcha hujjat" });
    expect(uz.results).toHaveLength(1);
  });

  it('sana bo‘yicha va ruxsatsiz papkaga kirilmaydi', async () => {
    const recent = await searchFiles({ roots: [allowed], extension: 'txt', modifiedWithinDays: 7 });
    expect(recent.results).toHaveLength(0);
    symlinkSync(outside, join(allowed, 'yorliq'), 'dir');
    const all = await searchFiles({ roots: [allowed], query: 'parol' });
    expect(all.results).toHaveLength(0);
  });

  it('bekor qilish', async () => {
    const c = new AbortController();
    c.abort();
    await expect(searchFiles({ roots: [allowed], query: 'x', signal: c.signal })).rejects.toThrow();
  });
});

describe('fayl vositalari (executor orqali)', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let cleanupDb: () => void;
  afterEach(() => cleanupDb?.());

  function setup(answer: boolean) {
    const t = tempDatabase();
    cleanupDb = t.cleanup;
    const opened: string[] = [];
    const registry = new ToolRegistry();
    for (const tool of createFileTools({
      folders: () => [{ id: '1', path: allowed, label: 'Hujjatlar' }],
      openPath: async (p) => {
        opened.push(p);
        return '';
      },
      showItemInFolder: () => undefined,
    }))
      registry.register(tool);
    const ref: { b?: ConfirmationBroker } = {};
    const broker = new ConfirmationBroker((r) => queueMicrotask(() => ref.b!.respond(r.id, answer)), 1000);
    ref.b = broker;
    const executor = new ToolExecutor(registry, broker, new AuditRepository(t.db), logger);
    const run = (name: string, args: Record<string, unknown>) =>
      executor.execute(
        { id: 'x', name, args },
        { source: 'ai', conversationId: null, messageId: null, signal: new AbortController().signal },
      );
    return { run, opened };
  }

  it('search_files papka nomi bilan', async () => {
    const { run } = setup(true);
    const r = await run('search_files', { extension: 'pdf', folder: 'Hujjatlar' });
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r.data)).toContain('dars jadvali.pdf');
    expect(JSON.stringify(r.data)).not.toContain('pdf"pdf'); // mazmun o'qilmaydi
  });

  it('dastur faylini ochish bloklanadi', async () => {
    const { run, opened } = setup(true);
    expect(await run('open_file', { path: join(allowed, 'setup.exe') })).toMatchObject({
      ok: false,
      errorCode: 'EXECUTABLE_BLOCKED',
    });
    expect(opened).toEqual([]);
  });

  it('ruxsatsiz papkadagi faylni ochib bo‘lmaydi', async () => {
    const { run, opened } = setup(true);
    expect(await run('open_file', { path: join(outside, 'parollar.txt') })).toMatchObject({
      ok: false,
      errorCode: 'OUTSIDE_ALLOWED',
    });
    expect(opened).toEqual([]);
  });

  it('papka yaratish: tasdiq bilan, mavjud bo‘lsa rad etiladi', async () => {
    const { run } = setup(true);
    expect(await run('create_folder', { parentPath: allowed, name: 'MARIUS' })).toMatchObject({
      ok: true,
      verified: true,
    });
    expect(existsSync(join(allowed, 'MARIUS'))).toBe(true);
    expect(await run('create_folder', { parentPath: allowed, name: 'MARIUS' })).toMatchObject({
      ok: false,
      errorCode: 'ALREADY_EXISTS',
    });
  });

  it('rad etilsa papka yaratilmaydi', async () => {
    const { run } = setup(false);
    expect(await run('create_folder', { parentPath: allowed, name: 'Yangi' })).toMatchObject({
      errorCode: 'USER_DENIED',
    });
    expect(existsSync(join(allowed, 'Yangi'))).toBe(false);
  });

  it('nusxalash va ko‘chirish ustidan yozmaydi', async () => {
    const { run } = setup(true);
    const src = join(allowed, 'Dars', 'eslatma.txt');
    writeFileSync(join(allowed, 'eslatma.txt'), 'BOSHQA');
    expect(await run('copy_file', { sourcePath: src, destinationFolder: allowed })).toMatchObject({
      errorCode: 'ALREADY_EXISTS',
    });
    expect(readFileSync(join(allowed, 'eslatma.txt'), 'utf8')).toBe('BOSHQA');
    expect(
      await run('move_file', {
        sourcePath: join(allowed, 'Dars', 'dars jadvali.pdf'),
        destinationFolder: allowed,
      }),
    ).toMatchObject({
      ok: true,
      verified: true,
    });
    expect(existsSync(join(allowed, 'dars jadvali.pdf'))).toBe(true);
    expect(existsSync(join(allowed, 'Dars', 'dars jadvali.pdf'))).toBe(false);
  });

  it('ruxsatsiz joyga ko‘chirib bo‘lmaydi', async () => {
    const { run } = setup(true);
    expect(
      await run('move_file', {
        sourcePath: join(allowed, 'Dars', 'eslatma.txt'),
        destinationFolder: outside,
      }),
    ).toMatchObject({
      ok: false,
      errorCode: 'OUTSIDE_ALLOWED',
    });
  });

  it('nomini o‘zgartirish: noto‘g‘ri nom va dasturga aylantirish rad etiladi', async () => {
    const { run } = setup(true);
    const f = join(allowed, 'Dars', 'eslatma.txt');
    expect(await run('rename_file', { path: f, newName: '../x.txt' })).toMatchObject({
      errorCode: 'BAD_NAME',
    });
    expect(await run('rename_file', { path: f, newName: 'virus.exe' })).toMatchObject({
      errorCode: 'EXECUTABLE_BLOCKED',
    });
    expect(await run('rename_file', { path: f, newName: 'yangi eslatma.txt' })).toMatchObject({
      ok: true,
      verified: true,
    });
  });
});
