import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, net, safeStorage, shell } from 'electron';
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
import type { FolderKey } from '@shared/ipc';

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

// Faqat development/test uchun: haqiqiy dasturlarni ochmasdan sinash (paketlangan ilovada e'tiborga olinmaydi)
const useFakeOs = !app.isPackaged && process.env['MARIUS_FAKE_OS'] === '1';

const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined;
const rendererFile = join(__dirname, '../renderer/index.html');
const preloadFile = join(__dirname, '../preload/index.js');

let mainWindow: BrowserWindow | null = null;
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

  win.once('ready-to-show', () => win.show());

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
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  void app.whenReady().then(() => {
    const p = paths();
    logger = createLogger(p.logDirectory, { echo: !app.isPackaged });
    logger.info('app.start', { version: APP_VERSION, platform: process.platform });

    try {
      db = openDatabase(p.databaseFile);
    } catch (error) {
      logger.error('database.open_failed', { error });
      throw error;
    }

    const settings = new SettingsRepository(db);
    nativeTheme.themeSource = settings.getAll().theme;
    lockDownPermissions(logger, createSenderGuard({ devServerUrl, rendererFile }));
    registerIpc(settings, db);
    mainWindow = createMainWindow(settings);
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
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
