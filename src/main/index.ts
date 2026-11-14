import { join } from 'node:path';
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  net,
  Notification,
  powerMonitor,
  safeStorage,
  session,
  shell,
  Tray,
} from 'electron';
import {
  CHAT_EVENT_CHANNEL,
  IPC_CHANNELS,
  TOOL_CONFIRM_CHANNEL,
  type AppInfo,
  type ChatEvent,
  type ConfirmationRequest,
} from '@shared/ipc';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { createLogger, type Logger } from './logging/logger';
import { openDatabase, type Database } from './database/database';
import { SettingsRepository } from './database/settings-repository';
import { AppError, createSenderGuard, dispatchIpc, type IpcHandlers } from './ipc/router';
import { hardenWindow, lockDownPermissions, secureWebPreferences } from './security/window';
import { createSystemMetricsService } from './services/system-metrics';
import { SecretStore, type Encryptor } from './database/secret-store';
import { ProviderSettingsRepository } from './database/provider-settings-repository';
import { MemoryConversationStore, SqliteConversationStore } from './database/conversation-store';
import { AiService } from './services/ai-service';
import { ChatService } from './services/chat-service';
import { VoiceService } from './services/voice-service';
import { AuditRepository } from './database/audit-repository';
import { ToolRegistry } from './tools/registry';
import { ConfirmationBroker } from './tools/confirmation';
import { ToolExecutor } from './tools/executor';
import { AppCatalog, createComputerTools } from './tools/computer-tools';
import { createProcessTools } from './tools/process-tools';
import { runAiDiagnostics } from './services/ai-diagnostics';
import { GEMINI_DEFAULT_BASE_URL } from '../modules/ai/gemini';
import { groupProcesses } from './windows/processes';
import { createElectronCapturer, createFakeCapturer } from './vision/screen-capture';
import { createVisionTools } from './vision/vision-tools';
import type { OsAdapter } from './windows/os-adapter';
import { createWindowsAdapter } from './windows/windows-adapter';
import { createFakeAdapter, createUnsupportedAdapter } from './windows/fake-adapter';
import { osDisplayName } from './services/system-metrics';
import type { ToolRunner } from './services/chat-service';
import { FolderRepository } from './files/folder-repository';
import { createFileTools } from './files/file-tools';
import { searchFiles } from './files/file-search';
import { existsSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { REMINDER_EVENT_CHANNEL, type FolderKey, type Reminder, type ReminderEvent } from '@shared/ipc';
import { MemoryRepository, looksSensitive } from './memory/memory-repository';
import { ReminderRepository } from './memory/reminder-repository';
import { ReminderScheduler } from './memory/scheduler';
import { createMemoryTools } from './memory/memory-tools';
import { ObsidianConfigRepository } from './obsidian/obsidian-config';
import { VaultService } from './obsidian/vault';
import { createObsidianTools } from './obsidian/obsidian-tools';
import { applyPendingRestore, backupTo, scheduleRestore } from './services/backup';
import { mkdir, readdir } from 'node:fs/promises';
import { createWebTools } from './web/web-tools';
import { createYoutubeClient } from '../modules/ai/youtube';

const APP_ID = 'uz.marius.app';

/** Build vaqtida package.json'dan qo'yiladi (electron.vite.config.mts). */
declare const __MARIUS_VERSION__: string;
const APP_VERSION = __MARIUS_VERSION__;

// %APPDATA%\MARIUS — foydalanuvchi ma'lumotlari shu yerda saqlanadi.
app.setName('MARIUS');
app.setAppUserModelId(APP_ID);

// Faqat development/test uchun: E2E testlar haqiqiy foydalanuvchi ma'lumotlariga tegmasligi kerak.
const testDataDir = process.env['MARIUS_USER_DATA_DIR'];
if (testDataDir && !app.isPackaged) app.setPath('userData', testDataDir);

// Faqat development/test uchun: E2E testda Gemini o'rniga lokal soxta server ishlatiladi.
const geminiBaseUrl = !app.isPackaged ? process.env['MARIUS_GEMINI_BASE_URL'] || undefined : undefined;

// Faqat development/test uchun: YouTube API o'rniga soxta server (E2E)
const youtubeBaseUrl = !app.isPackaged ? process.env['MARIUS_YOUTUBE_BASE_URL'] || undefined : undefined;
const YOUTUBE_SECRET = 'youtube.apiKey';

// Faqat development/test uchun: haqiqiy dasturlarni ochmasdan sinash (paketlangan ilovada e'tiborga olinmaydi)
const useFakeOs = !app.isPackaged && process.env['MARIUS_FAKE_OS'] === '1';

const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined;
const rendererFile = join(__dirname, '../renderer/index.html');
const preloadFile = join(__dirname, '../preload/index.js');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let scheduler: ReminderScheduler | null = null;
let getSettings: (() => { minimizeToTray: boolean }) | null = null;
let db: Database | null = null;
let logger: Logger;

function paths() {
  const dataDirectory = app.getPath('userData');
  return {
    dataDirectory,
    databaseFile: join(dataDirectory, 'marius.db'),
    logDirectory: join(dataDirectory, 'logs'),
  };
}

/** Windows avtomatik ishga tushirganda beriladigan belgi */
const AUTOSTART_ARG = '--marius-autostart';
/** Registr qiymati nomi (HKCU\...\Run). Uninstaller ham shu nom bilan o'chiradi: build/installer.nsh */
const LOGIN_ITEM_NAME = 'MARIUS';

/**
 * "Windows bilan birga ishga tushish" (standart o'chiq). Faqat o'rnatilgan Windows ilovasida:
 * dev rejimida electron.exe avtomatik ishga tushadigan qilib ro'yxatga olinmasligi kerak.
 */
function applyLoginItem(enabled: boolean): void {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    app.setLoginItemSettings({ openAtLogin: enabled, args: [AUTOSTART_ARG], name: LOGIN_ITEM_NAME });
  } catch (error) {
    logger.warn('login_item.failed', { error });
  }
}

function createMainWindow(settings: SettingsRepository): BrowserWindow {
  const theme = settings.getAll().theme;
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'MARIUS',
    backgroundColor: theme === 'dark' ? '#0c161b' : '#f3f7f8',
    autoHideMenuBar: true,
    webPreferences: secureWebPreferences(preloadFile, { devTools: !app.isPackaged }),
  });

  const isTrusted = createSenderGuard({ devServerUrl, rendererFile });
  hardenWindow(win, isTrusted, logger);

  win.once('ready-to-show', () => {
    // Avtomatik ishga tushganda: tray bo'lsa fonda qoladi, bo'lmasa vazifalar panelida kichraytirilgan holda
    if (process.argv.includes(AUTOSTART_ARG)) {
      if (tray) return;
      win.minimize();
      return;
    }
    win.show();
  });
  // Tray yoqilgan bo'lsa, yopish tugmasi oynani yashiradi (eslatmalar ishlashda davom etadi)
  win.on('close', (e) => {
    if (!isQuitting && getSettings?.().minimizeToTray && tray) {
      e.preventDefault();
      win.hide();
    }
  });
  win.webContents.once('did-finish-load', () => scheduler?.start());

  if (devServerUrl) void win.loadURL(devServerUrl);
  else void win.loadFile(rendererFile);

  return win;
}

/** Windows'da DPAPI orqali shifrlash. Mavjud bo'lmasa, kalit saqlanmaydi. */
const electronEncryptor: Encryptor = {
  isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: (plain) => safeStorage.encryptStringAsync(plain),
  decrypt: async (cipher) => (await safeStorage.decryptStringAsync(cipher)).result,
};

function emitConfirmation(request: ConfirmationRequest): void {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.flashFrame(!win.isFocused());
  win.webContents.send(TOOL_CONFIRM_CHANNEL, request);
}

function createOsAdapter(): OsAdapter {
  if (useFakeOs) return createFakeAdapter();
  return process.platform === 'win32' ? createWindowsAdapter() : createUnsupportedAdapter();
}

function emitReminderEvent(event: ReminderEvent): void {
  const wc = mainWindow?.webContents;
  if (wc && !wc.isDestroyed()) wc.send(REMINDER_EVENT_CHANNEL, event);
}

function showMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function iconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(__dirname, '../../build/icon.png');
}

/** Tray (ixtiyoriy, Sozlamalarda yoqiladi): oyna yopilganda MARIUS fonda qoladi va eslatmalar ishlaydi */
function updateTray(enabled: boolean): void {
  if (enabled && !tray) {
    tray = new Tray(nativeImage.createFromPath(iconPath()).resize({ width: 16, height: 16 }));
    tray.setToolTip('MARIUS');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'MARIUS’ni ochish', click: () => showMainWindow() },
        { type: 'separator' },
        {
          label: 'Chiqish',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ]),
    );
    tray.on('click', () => showMainWindow());
  } else if (!enabled && tray) {
    tray.destroy();
    tray = null;
  }
}

/** Eslatma vaqti keldi: Windows bildirishnomasi + ilova ichidagi xabar (bildirishnomalar o'chiq bo'lsa ham ko'rinadi) */
function notifyReminder(reminder: Reminder, missed: boolean): void {
  logger.info('reminder.fired', { missed });
  if (Notification.isSupported()) {
    const n = new Notification({
      title: missed ? 'MARIUS: o‘tkazib yuborilgan eslatma' : 'MARIUS eslatmasi',
      body: reminder.title,
      icon: iconPath(),
    });
    n.on('click', () => showMainWindow());
    n.show();
  }
  emitReminderEvent({ type: 'fired', reminder, missed });
}

function emitChatEvent(event: ChatEvent): void {
  const wc = mainWindow?.webContents;
  if (wc && !wc.isDestroyed()) wc.send(CHAT_EVENT_CHANNEL, event);
}

function registerIpc(settings: SettingsRepository, database: Database): void {
  const metrics = createSystemMetricsService({ isOnline: () => net.isOnline() });
  const ai = new AiService(
    new ProviderSettingsRepository(database),
    new SecretStore(database, electronEncryptor),
    {
      ...(geminiBaseUrl ? { geminiBaseUrl } : {}),
    },
  );
  // ---- Vositalar (PHASE 4) ----
  const osAdapter = createOsAdapter();
  logger.info('os.adapter', { kind: osAdapter.kind });
  const audit = new AuditRepository(database);
  const interruptedActions = audit.recoverInterrupted();
  if (interruptedActions > 0) logger.warn('audit.recovered_interrupted', { count: interruptedActions });
  const catalog = new AppCatalog(osAdapter);
  const registry = new ToolRegistry();
  for (const tool of createComputerTools({ os: osAdapter, catalog, isOnline: () => net.isOnline() })) {
    registry.register(tool);
  }
  // MARIUS'ning o'z jarayonlari (main, renderer, GPU...) hech qachon yopilmaydi
  const ownPids = () => new Set([process.pid, ...app.getAppMetrics().map((m) => m.pid)]);
  for (const tool of createProcessTools({ os: osAdapter, ownPids })) registry.register(tool);

  // ---- Fayllar (PHASE 5) ----
  const folders = new FolderRepository(database);
  for (const tool of createFileTools({
    folders: () => folders.list(),
    openPath: (p) => shell.openPath(p),
    showItemInFolder: (p) => shell.showItemInFolder(p),
  })) {
    registry.register(tool);
  }
  const FOLDER_KEYS: Record<FolderKey, { label: string; electron: Parameters<typeof app.getPath>[0] }> = {
    documents: { label: 'Hujjatlar', electron: 'documents' },
    downloads: { label: 'Yuklamalar', electron: 'downloads' },
    desktop: { label: 'Ish stoli', electron: 'desktop' },
    pictures: { label: 'Rasmlar', electron: 'pictures' },
    music: { label: 'Musiqa', electron: 'music' },
    videos: { label: 'Videolar', electron: 'videos' },
  };
  const folderInfos = () => folders.list().map((f) => ({ ...f, exists: existsSync(f.path) }));
  const addFolderPath = async (p: string, label: string) => {
    const real = await realpath(p);
    // Butun diskni yoki foydalanuvchi profilini to'liq ochish o'rniga aniq papka tanlash talab qilinadi
    if (/^[a-z]:\\?$/i.test(real) || real === '/' || real === app.getPath('home')) {
      throw new AppError('FOLDER_TOO_BROAD');
    }
    folders.add(real, label);
  };

  // ---- Internet (PHASE 6) ----
  const secrets = new SecretStore(database, electronEncryptor);
  const youtube = createYoutubeClient({
    apiKey: () => secrets.get(YOUTUBE_SECRET),
    ...(youtubeBaseUrl ? { baseUrl: youtubeBaseUrl } : {}),
  });
  for (const tool of createWebTools({
    engine: () => settings.getAll().searchEngine,
    openExternal: (url) => shell.openExternal(url),
    youtube,
    hasYoutubeKey: () => secrets.has(YOUTUBE_SECRET),
  })) {
    registry.register(tool);
  }

  // ---- Xotira va eslatmalar (PHASE 7) ----
  const memory = new MemoryRepository(database);
  const reminders = new ReminderRepository(database);
  scheduler = new ReminderScheduler(reminders, notifyReminder);
  const remindersChanged = () => {
    scheduler?.reschedule();
    emitReminderEvent({ type: 'changed' });
  };
  for (const tool of createMemoryTools({
    memory,
    reminders,
    memoryEnabled: () => settings.getAll().memoryEnabled,
    onRemindersChanged: remindersChanged,
  })) {
    registry.register(tool);
  }
  powerMonitor.on('resume', () => scheduler?.reschedule());
  getSettings = () => settings.getAll();
  updateTray(settings.getAll().minimizeToTray);
  const parseDue = (iso: string) => {
    const d = new Date(iso);
    if (d.getTime() <= Date.now()) throw new AppError('REMINDER_IN_PAST');
    return d;
  };

  // ---- Obsidian (PHASE 7B, v2.1) ----
  const obsidianConfig = new ObsidianConfigRepository(database);
  const vault = new VaultService(() => {
    const c = obsidianConfig.get();
    return c.enabled ? c.vaultPath : null;
  });
  for (const tool of createObsidianTools({
    config: () => obsidianConfig.get(),
    vault,
    aiIsCloud: () => ai.providerFor(ai.activeProvider() ?? 'gemini').getCapabilities().cloud,
  })) {
    registry.register(tool);
  }
  const obsidianStatus = async () => {
    const c = obsidianConfig.get();
    let accessible = false;
    let noteCount: number | null = null;
    if (c.vaultPath) {
      try {
        await readdir(c.vaultPath);
        accessible = true;
        if (c.enabled) noteCount = (await vault.listNotes()).length;
      } catch {
        accessible = false;
      }
    }
    return {
      ...c,
      obsidianInstalled: Boolean(app.getApplicationNameForProtocol('obsidian://')),
      accessible,
      noteCount,
      lastIndexedAt: vault.lastIndexedAt,
    };
  };

  // ---- Ekran tahlili (PHASE 8) ----
  for (const tool of createVisionTools({
    enabled: () => settings.getAll().screenAnalysisEnabled,
    resolveVision: () => ai.resolveVision(),
    capturer: useFakeOs ? createFakeCapturer() : createElectronCapturer(() => mainWindow),
    listWindows: () => (osAdapter.supported ? osAdapter.listWindows() : Promise.resolve([])),
  })) {
    registry.register(tool);
  }

  const broker = new ConfirmationBroker(emitConfirmation);
  const executor = new ToolExecutor(registry, broker, audit, logger);
  const toolRunner: ToolRunner = {
    declarations: () => registry.declarations(),
    execute: (call, ctx) => executor.execute(call, { source: 'ai', ...ctx }),
    activitiesFor: (ids) => audit.activitiesForMessages(ids),
  };
  const runUserAction = async (name: string, args: Record<string, unknown>) => {
    const out = await executor.execute(
      { id: randomUUID(), name, args },
      { source: 'user', conversationId: null, messageId: null, signal: new AbortController().signal },
    );
    return { ok: out.ok, message: out.message, verified: out.verified };
  };

  const persistentStore = new SqliteConversationStore(database);
  const recovered = persistentStore.recoverInterrupted();
  if (recovered > 0) logger.warn('chat.recovered_interrupted', { count: recovered });
  const chat = new ChatService({
    stores: { persistent: persistentStore, memory: new MemoryConversationStore() },
    saveHistory: () => settings.getAll().saveHistory,
    resolveProvider: () => ai.resolve(),
    emit: emitChatEvent,
    logger,
    tools: toolRunner,
    memoryForPrompt: () => (settings.getAll().memoryEnabled ? memory.forPrompt() : []),
  });
  const voice = new VoiceService({
    settings: () => settings.getAll(),
    audio: ai.geminiAudio,
    geminiChatModel: () => ai.geminiModel(),
    hasGeminiKey: () => ai.hasGeminiKey(),
    logger,
  });

  const handlers: IpcHandlers = {
    'app:getInfo': (): AppInfo => ({
      name: 'MARIUS',
      version: APP_VERSION,
      platform: `${process.platform} ${process.getSystemVersion()}`,
      electron: process.versions.electron,
      ...paths(),
    }),
    'system:getMetrics': () => metrics.collect(),
    'settings:getAll': () => settings.getAll(),
    'settings:update': (patch) => {
      const updated = settings.update(patch);
      nativeTheme.themeSource = updated.theme;
      if (patch.minimizeToTray !== undefined) updateTray(updated.minimizeToTray);
      if (patch.launchAtLogin !== undefined) applyLoginItem(updated.launchAtLogin);
      return updated;
    },
    'logs:openFolder': async () => {
      await shell.openPath(paths().logDirectory);
    },

    'ai:getSettings': () => ai.getSettings(),
    'ai:updateSettings': (patch) => ai.update(patch),
    'ai:setGeminiKey': ({ key }) => ai.setGeminiKey(key),
    'ai:deleteGeminiKey': () => ai.deleteGeminiKey(),
    'ai:testConnection': ({ provider }) => ai.testConnection(provider),
    'ai:findGeminiModel': () => ai.findGeminiModel(),
    'ai:diagnostics': async () => ({
      report: await runAiDiagnostics({
        ai,
        appVersion: APP_VERSION,
        osName: osDisplayName(),
        geminiBaseUrl: geminiBaseUrl ?? GEMINI_DEFAULT_BASE_URL,
        logFile: join(paths().logDirectory, 'marius.log'),
        resolveProxy: (url) => session.defaultSession.resolveProxy(url),
        tools: () => registry.declarations(),
      }),
    }),
    'app:copyText': ({ text }) => clipboard.writeText(text),

    'chat:listConversations': () => chat.listConversations(),
    'chat:getConversation': ({ id }) => chat.getConversation(id),
    'chat:send': ({ conversationId, text }) => chat.send(conversationId, text),
    'chat:regenerate': ({ conversationId }) => chat.regenerate(conversationId),
    'chat:cancel': ({ requestId }) => chat.cancel(requestId),
    'chat:deleteConversation': ({ id }) => chat.deleteConversation(id),
    'chat:clearAll': () => chat.clearAll(),

    'tools:respond': ({ id, approved }) => broker.respond(id, approved),
    'audit:list': ({ limit }) => audit.list(limit),
    'audit:clear': () => audit.clear(),
    'computer:info': async () => ({
      supported: osAdapter.supported,
      platform: process.platform,
      osName: osDisplayName(),
      cpuModel: os.cpus()[0]?.model.trim() ?? '',
      cores: os.cpus().length,
      memoryTotalBytes: os.totalmem(),
      uptimeSeconds: Math.round(os.uptime()),
      battery: await osAdapter.battery().catch(() => null),
    }),
    'computer:listApps': ({ refresh }) => catalog.list(refresh),
    'computer:launchApp': async ({ appId }) => {
      // Tarixda ichki ID emas, dastur nomi ko'rinishi uchun
      const app = await catalog.byId(appId);
      return runUserAction('launch_app', app ? { appId, name: app.name } : { appId });
    },
    'computer:listWindows': () => {
      if (!osAdapter.supported) throw new AppError('OS_UNSUPPORTED');
      return osAdapter.listWindows();
    },
    'computer:focusWindow': ({ pid }) => runUserAction('focus_window', { pid }),
    'computer:listProcesses': async ({ sortBy }) => {
      if (!osAdapter.supported) throw new AppError('OS_UNSUPPORTED');
      return {
        groups: groupProcesses(await osAdapter.listProcesses(), ownPids(), sortBy).slice(0, 40),
        memoryTotalBytes: os.totalmem(),
      };
    },
    'computer:closeApp': ({ name, force }) => runUserAction('close_app', { name, force }),
    'computer:media': ({ action, steps }) => runUserAction('media_control', { action, steps }),
    'vision:analyzeScreen': async ({ question }) => {
      const out = await executor.execute(
        { id: randomUUID(), name: 'analyze_screen', args: { question } },
        { source: 'user', conversationId: null, messageId: null, signal: new AbortController().signal },
      );
      const d = out.data as { description?: unknown } | undefined;
      return {
        ok: out.ok,
        message: out.message,
        description: out.ok && typeof d?.description === 'string' ? d.description : null,
      };
    },

    'files:listFolders': () => folderInfos(),
    'files:suggestions': () => {
      const added = new Set(folders.list().map((f) => f.path.toLowerCase()));
      return (Object.keys(FOLDER_KEYS) as FolderKey[]).map((key) => {
        const p = app.getPath(FOLDER_KEYS[key].electron);
        return { key, label: FOLDER_KEYS[key].label, path: p, added: added.has(p.toLowerCase()) };
      });
    },
    'files:addFolder': async (input) => {
      if (input.source === 'suggestion') {
        const def = FOLDER_KEYS[input.key];
        await addFolderPath(app.getPath(def.electron), def.label);
      } else {
        const res = mainWindow
          ? await dialog.showOpenDialog(mainWindow, {
              title: 'MARIUS uchun papka tanlang',
              properties: ['openDirectory'],
            })
          : { canceled: true, filePaths: [] };
        const picked = res.filePaths[0];
        if (!res.canceled && picked)
          await addFolderPath(picked, picked.split(/[\\/]/).filter(Boolean).pop() ?? picked);
      }
      return folderInfos();
    },
    'files:removeFolder': ({ id }) => {
      folders.remove(id);
      return folderInfos();
    },
    'files:search': async ({ folderId, ...q }) => {
      const all = folders.list();
      if (all.length === 0) throw new AppError('NO_ALLOWED_FOLDERS');
      const roots = (folderId ? all.filter((f) => f.id === folderId) : all).map((f) => f.path);
      return searchFiles({ roots, ...q, limit: 200 });
    },
    'files:open': ({ path: p }) => runUserAction('open_file', { path: p }),
    'files:showInFolder': ({ path: p }) => runUserAction('show_in_folder', { path: p }),

    'youtube:status': async () => ({
      hasKey: secrets.has(YOUTUBE_SECRET),
      secretStorageAvailable: await secrets.isAvailable(),
    }),
    'youtube:setKey': async ({ key }) => {
      await secrets.set(YOUTUBE_SECRET, key);
      try {
        const videos = await youtube.search('MARIUS test', 1);
        return {
          ok: true,
          models: [],
          message: `Kalit saqlandi va ishlayapti (${videos.length} ta sinov natijasi).`,
        };
      } catch (error) {
        const code =
          error instanceof Error && 'code' in error ? String((error as { code: unknown }).code) : '';
        return {
          ok: false,
          models: [],
          message:
            code === 'AI_AUTH_INVALID'
              ? 'Kalit saqlandi, lekin YouTube uni qabul qilmadi: kalit noto‘g‘ri yoki loyihada “YouTube Data API v3” yoqilmagan.'
              : 'Kalit saqlandi, lekin tekshirib bo‘lmadi (internet yoki limit). Keyinroq qayta urinib ko‘ring.',
        };
      }
    },
    'youtube:deleteKey': () => secrets.delete(YOUTUBE_SECRET),

    'memory:list': () => memory.list(),
    'memory:create': ({ content }) => {
      if (looksSensitive(content)) throw new AppError('SENSITIVE_MEMORY');
      memory.create(content, 'user');
      return memory.list();
    },
    'memory:update': ({ id, content }) => {
      if (looksSensitive(content)) throw new AppError('SENSITIVE_MEMORY');
      memory.update(id, content);
      return memory.list();
    },
    'memory:delete': ({ id }) => {
      memory.delete(id);
      return memory.list();
    },
    'memory:clear': () => memory.clear(),

    'reminders:list': () => reminders.list(),
    'reminders:create': ({ title, description, dueAt }) => {
      reminders.create(title, parseDue(dueAt), description);
      remindersChanged();
      return reminders.list();
    },
    'reminders:update': ({ id, title, description, dueAt }) => {
      reminders.update(id, {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(dueAt !== undefined ? { due: parseDue(dueAt) } : {}),
      });
      remindersChanged();
      return reminders.list();
    },
    'reminders:setStatus': ({ id, status }) => {
      reminders.setStatus(id, status);
      remindersChanged();
      return reminders.list();
    },
    'reminders:delete': ({ id }) => {
      reminders.delete(id);
      remindersChanged();
      return reminders.list();
    },

    'obsidian:status': () => obsidianStatus(),
    'obsidian:update': async (patch) => {
      const c = obsidianConfig.get();
      if (!c.vaultPath && patch.enabled) throw new AppError('OBSIDIAN_NO_VAULT');
      obsidianConfig.set(patch);
      return obsidianStatus();
    },
    'obsidian:chooseVault': async ({ mode }) => {
      if (!mainWindow) return obsidianStatus();
      const res = await dialog.showOpenDialog(mainWindow, {
        title: mode === 'create' ? 'Yangi Vault qayerda yaratilsin?' : 'Obsidian Vault papkasini tanlang',
        properties: ['openDirectory', 'createDirectory'],
      });
      const picked = res.filePaths[0];
      if (res.canceled || !picked) return obsidianStatus();
      let target = await realpath(picked);
      if (mode === 'create') {
        target = join(target, 'MARIUS Vault');
        await mkdir(target, { recursive: false }).catch((e: NodeJS.ErrnoException) => {
          if (e.code !== 'EEXIST') throw e;
        });
      }
      // Vault tanlash yozish huquqini bermaydi: Create/Append alohida yoqiladi (v2.1 §4)
      obsidianConfig.set({ vaultPath: target, enabled: true, read: true, create: false, append: false });
      vault.clearIndex();
      return obsidianStatus();
    },
    'obsidian:disconnect': () => {
      obsidianConfig.disconnect();
      vault.clearIndex();
      return obsidianStatus();
    },
    'obsidian:open': async () => {
      const c = obsidianConfig.get();
      if (!c.vaultPath) throw new AppError('OBSIDIAN_NO_VAULT');
      if (app.getApplicationNameForProtocol('obsidian://')) {
        await shell.openExternal(`obsidian://open?path=${encodeURIComponent(c.vaultPath)}`);
      } else {
        await shell.openPath(c.vaultPath);
      }
    },
    'obsidian:clearIndex': () => {
      vault.clearIndex();
      return obsidianStatus();
    },

    'data:backup': async () => {
      if (!mainWindow) return { saved: false, path: null, message: '' };
      const res = await dialog.showSaveDialog(mainWindow, {
        title: 'MARIUS zaxira nusxasi',
        defaultPath: join(
          app.getPath('documents'),
          `marius-zaxira-${new Date().toISOString().slice(0, 10)}.db`,
        ),
        filters: [{ name: 'MARIUS zaxira', extensions: ['db'] }],
      });
      if (res.canceled || !res.filePath) return { saved: false, path: null, message: 'Bekor qilindi.' };
      const stats = backupTo(database, res.filePath);
      logger.info('data.backup', { conversations: stats.conversations, reminders: stats.reminders });
      return {
        saved: true,
        path: res.filePath,
        message: `Zaxira saqlandi: ${stats.conversations} ta suhbat, ${stats.reminders} ta eslatma. API kalitlari zaxiraga kirmaydi.`,
      };
    },
    'data:restore': async () => {
      if (!mainWindow) return { scheduled: false, message: '' };
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Tiklash uchun MARIUS zaxirasini tanlang',
        filters: [{ name: 'MARIUS zaxira', extensions: ['db'] }],
        properties: ['openFile'],
      });
      const file = res.filePaths[0];
      if (res.canceled || !file) return { scheduled: false, message: 'Bekor qilindi.' };
      let before: string;
      try {
        before = scheduleRestore(database, paths().databaseFile, file);
      } catch (e) {
        return { scheduled: false, message: e instanceof Error ? e.message : 'Tiklab bo‘lmadi.' };
      }
      logger.warn('data.restore_scheduled', {});
      setTimeout(() => {
        isQuitting = true;
        app.relaunch();
        app.exit(0);
      }, 1500);
      return {
        scheduled: true,
        message: `Joriy ma’lumotlar nusxasi saqlandi (${before}). MARIUS qayta ishga tushmoqda…`,
      };
    },

    'voice:transcribe': async ({ audio, mimeType }) => ({ text: await voice.transcribe(audio, mimeType) }),
    'voice:synthesize': ({ text }) => voice.synthesize(text),
  };

  const isTrusted = createSenderGuard({ devServerUrl, rendererFile });
  for (const channel of IPC_CHANNELS) {
    ipcMain.handle(channel, (event, input) =>
      dispatchIpc(channel, input, event.senderFrame?.url ?? '', handlers, isTrusted, logger),
    );
  }
}

// Bir vaqtda faqat bitta MARIUS nusxasi ishlaydi.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Ikkinchi marta ochilganda mavjud oyna ko'rsatiladi (tray'da yashiringan bo'lsa ham)
  app.on('second-instance', () => showMainWindow());

  void app.whenReady().then(() => {
    const p = paths();
    logger = createLogger(p.logDirectory, { echo: !app.isPackaged });
    logger.info('app.start', { version: APP_VERSION, platform: process.platform });

    try {
      if (applyPendingRestore(p.databaseFile)) logger.warn('data.restored', {});
      db = openDatabase(p.databaseFile);
    } catch (error) {
      logger.error('database.open_failed', { error });
      throw error;
    }

    const settings = new SettingsRepository(db);
    nativeTheme.themeSource = settings.getAll().theme;
    lockDownPermissions(logger, createSenderGuard({ devServerUrl, rendererFile }));
    registerIpc(settings, db);
    // Sozlama va Windows ro'yxatini moslashtirish (masalan, zaxiradan tiklangandan keyin)
    applyLoginItem(settings.getAll().launchAtLogin);
    mainWindow = createMainWindow(settings);
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    scheduler?.stop();
  });

  app.on('window-all-closed', () => {
    if (!tray) app.quit();
  });

  app.on('will-quit', () => {
    try {
      db?.close();
    } catch {
      // yopishdagi xatolik muhim emas
    }
    logger?.info('app.quit');
  });

  process.on('uncaughtException', (error) => {
    logger?.error('process.uncaught_exception', { error });
  });
  process.on('unhandledRejection', (reason) => {
    logger?.error('process.unhandled_rejection', { reason: String(reason) });
  });
}
