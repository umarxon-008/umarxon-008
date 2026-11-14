import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { ObsidianConfigRepository, type ObsidianConfig } from '../../src/main/obsidian/obsidian-config';
import { createObsidianTools } from '../../src/main/obsidian/obsidian-tools';
import { buildNote, VaultService } from '../../src/main/obsidian/vault';
import type { ToolManifest } from '../../src/main/tools/types';
import {
  applyPendingRestore,
  backupTo,
  scheduleRestore,
  validateBackup,
} from '../../src/main/services/backup';
import { openDatabase } from '../../src/main/database/database';
import { SqliteConversationStore } from '../../src/main/database/conversation-store';
import { tempDatabase } from './helpers/db';

let base: string;
let vaultDir: string;
let outside: string;
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'marius-obs-'));
  vaultDir = join(base, 'Vault');
  outside = join(base, 'Tashqi');
  mkdirSync(join(vaultDir, 'Darslar'), { recursive: true });
  mkdirSync(outside);
  writeFileSync(
    join(vaultDir, 'Darslar', 'C++ sikllar.md'),
    '# C++\n\nfor sikli haqida qaydlar. O‘zbekcha: g‘alaba 😊',
  );
  writeFileSync(join(vaultDir, 'Reja.md'), '# Reja\n\nErtaga imtihon');
  writeFileSync(join(vaultDir, 'rasm.png'), 'PNG');
  writeFileSync(join(outside, 'maxfiy.md'), 'SECRET');
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

function setup(config: Partial<ObsidianConfig>) {
  const cfg: ObsidianConfig = {
    enabled: true,
    vaultPath: vaultDir,
    read: false,
    create: false,
    append: false,
    ...config,
  };
  const vault = new VaultService(() => (cfg.enabled ? cfg.vaultPath : null));
  const tools = createObsidianTools({ config: () => cfg, vault, aiIsCloud: () => true });
  const get = <I>(id: string) => tools.find((t) => t.id === id) as ToolManifest<I>;
  return { get, vault, cfg };
}

describe('Obsidian qabul testlari (v2.1 §9)', () => {
  it('B: Vault tanlanmagan — vositalar xatosiz rad etadi', async () => {
    const { get } = setup({ vaultPath: null, enabled: false });
    expect(await get<{ query: string }>('vault_search').prepare({ query: 'C++' })).toMatchObject({
      kind: 'done',
      output: { errorCode: 'OBSIDIAN_DISABLED' },
    });
  });

  it('C: faqat o‘qish — qidiruv ishlaydi (faqat .md), yaratish bloklanadi', async () => {
    const { get } = setup({ read: true });
    const r = await get<{ query: string }>('vault_search').prepare({ query: 'for sikli' });
    expect(r.kind === 'done' && r.output.ok).toBe(true);
    expect(JSON.stringify(r)).toContain('C++ sikllar');
    expect(JSON.stringify(r)).not.toContain('rasm.png');
    expect(
      await get<{ title: string; content: string }>('vault_create_note').prepare({
        title: 'Yangi',
        content: 'x',
      }),
    ).toMatchObject({
      kind: 'done',
      output: { errorCode: 'OBSIDIAN_PERMISSION' },
    });
  });

  it('D: yozish ruxsati yo‘q — hech qanday fayl yaratilmaydi yoki o‘zgarmaydi', async () => {
    const { get } = setup({ read: true });
    await get<{ path: string; text: string }>('vault_append_note').prepare({
      path: join(vaultDir, 'Reja.md'),
      text: 'x',
    });
    expect(readFileSync(join(vaultDir, 'Reja.md'), 'utf8')).toBe('# Reja\n\nErtaga imtihon');
    expect(existsSync(join(vaultDir, 'Yangi.md'))).toBe(false);
  });

  it('E + I: yaratish ON — preview bilan, tasdiqdan keyin; o‘zbek harflari va emoji buzilmaydi', async () => {
    const { get } = setup({ read: true, create: true });
    const p = await get<{ title: string; content: string }>('vault_create_note').prepare({
      title: 'Uchrashuv qaydlari',
      content: 'G‘olib bo‘ldik! O‘zbekiston 🇺🇿 “qo‘shtirnoq”',
    });
    expect(p.kind).toBe('action');
    if (p.kind !== 'action') return;
    expect(p.confirm.preview).toContain('source: MARIUS');
    expect(existsSync(join(vaultDir, 'Uchrashuv qaydlari.md'))).toBe(false); // tasdiqdan oldin yo'q
    await p.run(new AbortController().signal);
    const text = readFileSync(join(vaultDir, 'Uchrashuv qaydlari.md'), 'utf8');
    expect(text).toContain('G‘olib bo‘ldik! O‘zbekiston 🇺🇿 “qo‘shtirnoq”');
    expect(text.startsWith('---\ncreated: ')).toBe(true);
  });

  it('F: Vault tashqarisi va symlink orqali qochish rad etiladi', async () => {
    const { get } = setup({ read: true, append: true });
    expect(
      await get<{ path: string }>('vault_read_note').prepare({ path: join(outside, 'maxfiy.md') }),
    ).toMatchObject({
      kind: 'done',
      output: { ok: false },
    });
    expect(
      await get<{ path: string }>('vault_read_note').prepare({
        path: join(vaultDir, '..', 'Tashqi', 'maxfiy.md'),
      }),
    ).toMatchObject({
      kind: 'done',
      output: { ok: false },
    });
    symlinkSync(outside, join(vaultDir, 'yorliq'), 'dir');
    expect(
      await get<{ path: string }>('vault_read_note').prepare({ path: join(vaultDir, 'yorliq', 'maxfiy.md') }),
    ).toMatchObject({
      kind: 'done',
      output: { ok: false },
    });
    expect(
      await get<{ title: string; content: string; folder: string }>('vault_create_note').prepare({
        title: 'x',
        content: 'y',
        folder: '../Tashqi',
      }),
    ).toMatchObject({
      kind: 'done',
      output: { ok: false },
    });
  });

  it('G: mavjud note ustidan yozilmaydi', async () => {
    const { get } = setup({ create: true });
    expect(
      await get<{ title: string; content: string }>('vault_create_note').prepare({
        title: 'Reja',
        content: 'yangi',
      }),
    ).toMatchObject({
      kind: 'done',
      output: { errorCode: 'ALREADY_EXISTS' },
    });
    expect(readFileSync(join(vaultDir, 'Reja.md'), 'utf8')).toBe('# Reja\n\nErtaga imtihon');
  });

  it('append: faqat oxiriga, oraliqda o‘zgargan bo‘lsa rad etiladi', async () => {
    const { get } = setup({ append: true });
    const t = get<{ path: string; text: string }>('vault_append_note');
    const p = await t.prepare({ path: join(vaultDir, 'Reja.md'), text: '- Kitob olish' });
    if (p.kind !== 'action') throw new Error('action kutilgan');
    expect(p.confirm.preview).toContain('- Kitob olish');
    expect(await p.run(new AbortController().signal)).toMatchObject({ ok: true, verified: true });
    expect(readFileSync(join(vaultDir, 'Reja.md'), 'utf8')).toBe(
      '# Reja\n\nErtaga imtihon\n\n- Kitob olish\n',
    );

    const p2 = await t.prepare({ path: join(vaultDir, 'Reja.md'), text: 'yana' });
    await new Promise((r) => setTimeout(r, 20));
    writeFileSync(join(vaultDir, 'Reja.md'), 'Obsidian’da tahrirlandi'); // poyga holati
    if (p2.kind !== 'action') throw new Error('action kutilgan');
    expect(await p2.run(new AbortController().signal)).toMatchObject({
      ok: false,
      errorCode: 'NOTE_CHANGED',
    });
    expect(readFileSync(join(vaultDir, 'Reja.md'), 'utf8')).toBe('Obsidian’da tahrirlandi');
  });

  it('H: uzilgandan keyin Vault’ga murojaat yo‘q; uzish barcha ruxsatlarni o‘chiradi', () => {
    const t = tempDatabase();
    try {
      const repo = new ObsidianConfigRepository(t.db);
      expect(repo.get()).toEqual({
        enabled: false,
        vaultPath: null,
        read: false,
        create: false,
        append: false,
      }); // default OFF
      repo.set({ vaultPath: vaultDir, enabled: true, read: true, create: true });
      expect(repo.disconnect()).toEqual({
        enabled: false,
        vaultPath: null,
        read: false,
        create: false,
        append: false,
      });
    } finally {
      t.cleanup();
    }
  });

  it('note’ni o‘qish: cloud AI haqida ogohlantirish, mazmun ishonchsiz deb belgilanadi', async () => {
    const { get } = setup({ read: true });
    const p = await get<{ path: string }>('vault_read_note').prepare({ path: join(vaultDir, 'Reja.md') });
    if (p.kind !== 'action') throw new Error('action kutilgan');
    expect(p.confirm.effect).toMatch(/Google/);
    const out = await p.run(new AbortController().signal);
    expect(out.data).toMatchObject({ untrustedExternalText: true, text: '# Reja\n\nErtaga imtihon' });
  });

  it('note formati', () => {
    expect(buildNote('Sarlavha', 'Matn', new Date('2026-11-13T00:00:00Z'))).toBe(
      '---\ncreated: 2026-11-13T00:00:00.000Z\nsource: MARIUS\n---\n\n# Sarlavha\n\nMatn\n',
    );
  });
});

describe('zaxira va tiklash', () => {
  it('zaxirada API kalitlari yo‘q; tiklash ma’lumotni almashtiradi va joriy kalitlarni saqlaydi', () => {
    const dir = mkdtempSync(join(tmpdir(), 'marius-bk-'));
    try {
      const dbFile = join(dir, 'marius.db');
      const db = openDatabase(dbFile);
      const store = new SqliteConversationStore(db);
      store.createConversation('Zaxiradagi suhbat');
      db.prepare("INSERT INTO secrets (name, ciphertext) VALUES ('gemini.apiKey', 'SHIFR')").run();
      const backup = join(dir, 'zaxira.db');
      expect(backupTo(db, backup)).toMatchObject({ conversations: 1 });
      const check = new DatabaseSync(backup, { readOnly: true });
      expect((check.prepare('SELECT COUNT(*) AS n FROM secrets').get() as { n: number }).n).toBe(0);
      check.close();
      expect(validateBackup(backup)).toEqual({ ok: true });

      store.createConversation('Keyin qo‘shilgan');
      const before = scheduleRestore(db, dbFile, backup);
      expect(existsSync(before)).toBe(true);
      db.close();
      expect(applyPendingRestore(dbFile)).toBe(true);
      const restored = openDatabase(dbFile);
      const titles = new SqliteConversationStore(restored).listConversations().map((c) => c.title);
      expect(titles).toEqual(['Zaxiradagi suhbat']);
      expect(
        (restored.prepare('SELECT ciphertext FROM secrets').get() as { ciphertext: string }).ciphertext,
      ).toBe('SHIFR');
      restored.close();
      expect(applyPendingRestore(dbFile)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('MARIUS zaxirasi bo‘lmagan fayl rad etiladi', () => {
    const dir = mkdtempSync(join(tmpdir(), 'marius-bk2-'));
    try {
      writeFileSync(join(dir, 'x.db'), 'not sqlite');
      expect(validateBackup(join(dir, 'x.db')).ok).toBe(false);
      const other = new DatabaseSync(join(dir, 'other.db'));
      other.exec('CREATE TABLE t (x)');
      other.close();
      expect(validateBackup(join(dir, 'other.db'))).toMatchObject({
        ok: false,
        reason: 'Bu fayl MARIUS zaxirasi emas.',
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
