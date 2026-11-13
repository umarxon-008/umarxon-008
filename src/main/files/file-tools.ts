import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { ToolManifest, ToolOutput } from '../tools/types';
import { searchFiles } from './file-search';
import {
  GUARD_MESSAGES,
  guardExisting,
  guardNew,
  isExecutable,
  validateFileName,
  type GuardResult,
} from './path-guard';
import type { AllowedFolder } from './folder-repository';

export interface FileToolDeps {
  folders: () => AllowedFolder[];
  openPath: (p: string) => Promise<string>; // Electron shell.openPath: bo'sh qator = muvaffaqiyat
  showItemInFolder: (p: string) => void;
}

const fail = (reason: keyof typeof GUARD_MESSAGES | string, message?: string): ToolOutput => ({
  ok: false,
  verified: null,
  errorCode: reason,
  message: message ?? GUARD_MESSAGES[reason as keyof typeof GUARD_MESSAGES] ?? 'Amal bajarilmadi.',
});

const PathArg = z.string().min(1).max(1000);
const done = (output: ToolOutput) => ({ kind: 'done' as const, output });

function guarded(r: GuardResult): r is Extract<GuardResult, { ok: true }> {
  return r.ok;
}

/** Fayl vositalari (prompt §10.3): hech qachon mavjud fayl ustidan yozilmaydi, o'chirish yo'q. */
export function createFileTools(deps: FileToolDeps): ToolManifest<unknown>[] {
  const roots = () => deps.folders().map((f) => f.path);

  /** AI papka nomini ("Downloads") yoki to'liq yo'lni berishi mumkin */
  const resolveFolder = (folder: string | undefined): string[] | null => {
    const all = deps.folders();
    if (!folder) return all.map((f) => f.path);
    const f = all.find((x) => x.label.toLowerCase() === folder.toLowerCase() || x.path === folder);
    return f ? [f.path] : null;
  };

  const listFolders: ToolManifest<Record<string, never>> = {
    id: 'list_allowed_folders',
    version: '1.0.0',
    title: 'Ruxsatli papkalar',
    description:
      'List folders the user has allowed MARIUS to search and manage. Files outside these folders are not accessible.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z.object({}).strict(),
    timeoutMs: 5000,
    summarize: () => 'Ruxsatli papkalar ro‘yxatini o‘qish',
    prepare: async () =>
      done({
        ok: true,
        verified: null,
        message: `${deps.folders().length} ta ruxsatli papka.`,
        data: { folders: deps.folders().map((f) => ({ name: f.label, path: f.path })) },
      }),
  };

  const search: ToolManifest<{
    query?: string | undefined;
    extension?: string | undefined;
    folder?: string | undefined;
    modifiedWithinDays?: number | undefined;
  }> = {
    id: 'search_files',
    version: '1.0.0',
    title: 'Fayl qidirish',
    description:
      'Search files by name, extension (e.g. "pdf") and modification date inside the user-allowed folders. ' +
      'Optional "folder" is an allowed folder name like "Downloads". Returns paths; file contents are NOT read.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z
      .object({
        query: z.string().max(200).optional(),
        extension: z
          .string()
          .max(20)
          .regex(/^\.?[\w]+$/)
          .optional(),
        folder: z.string().max(500).optional(),
        modifiedWithinDays: z.number().int().min(1).max(3650).optional(),
      })
      .strict(),
    timeoutMs: 60_000,
    summarize: (i) =>
      `Fayl qidirish: ${[i.query && `“${i.query}”`, i.extension && `.${i.extension.replace(/^\./, '')}`, i.folder].filter(Boolean).join(', ') || 'barchasi'}`,
    async prepare(input) {
      if (deps.folders().length === 0) return done(fail('NO_ALLOWED_FOLDERS'));
      const searchRoots = resolveFolder(input.folder);
      if (!searchRoots)
        return done(fail('OUTSIDE_ALLOWED', `“${input.folder}” ruxsatli papkalar orasida yo‘q.`));
      if (!input.query && !input.extension && !input.modifiedWithinDays) {
        return done(fail('INVALID_ARGS', 'Qidiruv uchun nom, kengaytma yoki sana kerak.'));
      }
      const r = await searchFiles({
        roots: searchRoots,
        query: input.query,
        extension: input.extension,
        modifiedWithinDays: input.modifiedWithinDays,
        limit: 50,
      });
      return done({
        ok: true,
        verified: null,
        message: r.results.length ? `${r.results.length} ta natija topildi.` : 'Hech narsa topilmadi.',
        data: {
          truncated: r.truncated,
          results: r.results.map((f) => ({
            name: f.name,
            path: f.path,
            folder: f.folder,
            modified: f.modifiedAt.slice(0, 16),
            sizeKb: Math.round(f.size / 1024),
            isFolder: f.isDirectory,
          })),
        },
      });
    },
  };

  const openFile: ToolManifest<{ path: string }> = {
    id: 'open_file',
    version: '1.0.0',
    title: 'Fayl ochish',
    description:
      'Open a file or folder (from search_files results) with its default Windows application. Programs/scripts are never executed. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ path: PathArg }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => `Fayl ochish: ${path.basename(i.path)}`,
    async prepare(input) {
      const g = await guardExisting(input.path, roots());
      if (!guarded(g)) return done(fail(g.reason));
      if (isExecutable(g.real)) {
        return done(
          fail(
            'EXECUTABLE_BLOCKED',
            'Dastur yoki skript fayllari xavfsizlik uchun ochilmaydi. “Joylashuvini ko‘rsatish”dan foydalaning.',
          ),
        );
      }
      return {
        kind: 'action',
        confirm: {
          action: 'Faylni ochish',
          target: g.real,
          effect: 'Fayl o‘ziga mos dasturda ochiladi. Fayl o‘zgarmaydi.',
        },
        run: async () => {
          const err = await deps.openPath(g.real);
          return err
            ? { ok: false, verified: false, message: `Faylni ochib bo‘lmadi: ${err}` }
            : { ok: true, verified: null, message: `${path.basename(g.real)} ochildi.` };
        },
      };
    },
  };

  const showInFolder: ToolManifest<{ path: string }> = {
    id: 'show_in_folder',
    version: '1.0.0',
    title: 'Joylashuvni ko‘rsatish',
    description:
      'Show where a file is located: opens Windows Explorer with the file selected. Nothing is modified.',
    permissionLevel: 1,
    confirmation: 'never',
    input: z.object({ path: PathArg }).strict(),
    timeoutMs: 10_000,
    summarize: (i) => `Joylashuvni ko‘rsatish: ${path.basename(i.path)}`,
    async prepare(input) {
      const g = await guardExisting(input.path, roots());
      if (!guarded(g)) return done(fail(g.reason));
      deps.showItemInFolder(g.real);
      return done({
        ok: true,
        verified: null,
        message: `${path.basename(g.real)} joylashgan papka ochildi.`,
        data: { folder: path.dirname(g.real) },
      });
    },
  };

  const createFolder: ToolManifest<{ parentPath: string; name: string }> = {
    id: 'create_folder',
    version: '1.0.0',
    title: 'Papka yaratish',
    description:
      'Create a new folder inside an allowed folder. Fails if it already exists. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ parentPath: PathArg, name: z.string().min(1).max(200) }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => `Papka yaratish: ${i.name}`,
    async prepare(input) {
      const nameError = validateFileName(input.name);
      if (nameError) return done(fail('BAD_NAME', nameError));
      const g = await guardNew(input.parentPath, input.name, roots());
      if (!guarded(g)) return done(fail(g.reason));
      if (existsSync(g.real)) return done(fail('ALREADY_EXISTS', `“${input.name}” allaqachon mavjud.`));
      return {
        kind: 'action',
        confirm: {
          action: 'Yangi papka yaratish',
          target: g.real,
          effect: 'Bo‘sh papka yaratiladi. Boshqa fayllar o‘zgarmaydi.',
        },
        run: async () => {
          await mkdir(g.real);
          const ok = (await stat(g.real)).isDirectory();
          return {
            ok,
            verified: ok,
            message: ok ? `“${input.name}” papkasi yaratildi.` : 'Papka yaratilmadi.',
          };
        },
      };
    },
  };

  /** Nusxa/ko'chirish uchun umumiy tayyorlov: manba fayl, maqsad papka ruxsatli, maqsadda bir xil nomli fayl yo'q */
  async function prepareTransfer(sourcePath: string, destinationFolder: string) {
    const src = await guardExisting(sourcePath, roots());
    if (!guarded(src)) return { error: fail(src.reason) };
    if (!(await stat(src.real)).isFile())
      return { error: fail('NOT_A_FILE', 'Faqat fayllarni ko‘chirish yoki nusxalash mumkin.') };
    const dest = await guardNew(destinationFolder, path.basename(src.real), roots());
    if (!guarded(dest)) return { error: fail(dest.reason) };
    if (existsSync(dest.real)) {
      return {
        error: fail(
          'ALREADY_EXISTS',
          `Maqsad papkada “${path.basename(src.real)}” allaqachon bor. Ustidan yozilmaydi.`,
        ),
      };
    }
    return { src: src.real, dest: dest.real };
  }

  const copy: ToolManifest<{ sourcePath: string; destinationFolder: string }> = {
    id: 'copy_file',
    version: '1.0.0',
    title: 'Fayl nusxalash',
    description: 'Copy a file into another allowed folder. Never overwrites. Requires confirmation.',
    permissionLevel: 2,
    confirmation: 'always',
    input: z.object({ sourcePath: PathArg, destinationFolder: PathArg }).strict(),
    timeoutMs: 300_000,
    summarize: (i) => `Nusxalash: ${path.basename(i.sourcePath)}`,
    async prepare(input) {
      const t = await prepareTransfer(input.sourcePath, input.destinationFolder);
      if ('error' in t) return done(t.error!);
      return {
        kind: 'action',
        confirm: {
          action: 'Faylni nusxalash',
          target: `${t.src}\n→ ${t.dest}`,
          effect: 'Yangi nusxa yaratiladi. Asl fayl o‘zgarmaydi.',
        },
        run: async () => {
          await copyFile(t.src, t.dest, constants.COPYFILE_EXCL);
          const ok = existsSync(t.dest);
          return { ok, verified: ok, message: ok ? 'Fayl nusxalandi.' : 'Nusxalab bo‘lmadi.' };
        },
      };
    },
  };

  const move: ToolManifest<{ sourcePath: string; destinationFolder: string }> = {
    id: 'move_file',
    version: '1.0.0',
    title: 'Fayl ko‘chirish',
    description: 'Move a file into another allowed folder. Never overwrites. Requires confirmation.',
    permissionLevel: 3,
    confirmation: 'always',
    input: z.object({ sourcePath: PathArg, destinationFolder: PathArg }).strict(),
    timeoutMs: 300_000,
    summarize: (i) => `Ko‘chirish: ${path.basename(i.sourcePath)}`,
    async prepare(input) {
      const t = await prepareTransfer(input.sourcePath, input.destinationFolder);
      if ('error' in t) return done(t.error!);
      return {
        kind: 'action',
        confirm: {
          action: 'Faylni ko‘chirish',
          target: `${t.src}\n→ ${t.dest}`,
          effect: 'Fayl yangi joyga o‘tadi va eski joyda qolmaydi.',
        },
        run: async () => {
          try {
            await rename(t.src, t.dest);
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e;
            // Boshqa diskka: avval nusxa, tekshiruv, keyin asl faylni olib tashlash
            await copyFile(t.src, t.dest, constants.COPYFILE_EXCL);
            if ((await stat(t.dest)).size !== (await stat(t.src)).size) throw new Error('copy size mismatch', { cause: e });
            await unlink(t.src);
          }
          const ok = existsSync(t.dest) && !existsSync(t.src);
          return { ok, verified: ok, message: ok ? 'Fayl ko‘chirildi.' : 'Ko‘chirish tekshiruvdan o‘tmadi.' };
        },
      };
    },
  };

  const renameTool: ToolManifest<{ path: string; newName: string }> = {
    id: 'rename_file',
    version: '1.0.0',
    title: 'Nomini o‘zgartirish',
    description:
      'Rename a file or folder inside its current folder. Never overwrites. Requires confirmation.',
    permissionLevel: 3,
    confirmation: 'always',
    input: z.object({ path: PathArg, newName: z.string().min(1).max(200) }).strict(),
    timeoutMs: 150_000,
    summarize: (i) => `Nomini o‘zgartirish: ${path.basename(i.path)} → ${i.newName}`,
    async prepare(input) {
      const nameError = validateFileName(input.newName);
      if (nameError) return done(fail('BAD_NAME', nameError));
      const src = await guardExisting(input.path, roots());
      if (!guarded(src)) return done(fail(src.reason));
      const dest = path.join(path.dirname(src.real), input.newName);
      if (existsSync(dest))
        return done(fail('ALREADY_EXISTS', `“${input.newName}” nomli fayl allaqachon bor.`));
      if (isExecutable(dest) && !isExecutable(src.real)) {
        return done(
          fail('EXECUTABLE_BLOCKED', 'Faylni dastur yoki skript kengaytmasiga o‘zgartirib bo‘lmaydi.'),
        );
      }
      return {
        kind: 'action',
        confirm: {
          action: 'Nomini o‘zgartirish',
          target: `${src.real}\n→ ${input.newName}`,
          effect: 'Faqat nomi o‘zgaradi. Mazmuni o‘zgarmaydi.',
        },
        run: async () => {
          await rename(src.real, dest);
          const ok = existsSync(dest);
          return {
            ok,
            verified: ok,
            message: ok ? `Nomi “${input.newName}” ga o‘zgartirildi.` : 'Nomini o‘zgartirib bo‘lmadi.',
          };
        },
      };
    },
  };

  return [
    listFolders,
    search,
    openFile,
    showInFolder,
    createFolder,
    copy,
    move,
    renameTool,
  ] as unknown as ToolManifest<unknown>[];
}
