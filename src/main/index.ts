import { join } from 'node:path';
import { app, BrowserWindow, ipcMain, nativeTheme, net, safeStorage, shell } from 'electron';
import { CHAT_EVENT_CHANNEL, IPC_CHANNELS, type AppInfo, type ChatEvent } from '@shared/ipc';
import { createLogger, type Logger } from './logging/logger';
import { openDatabase, type Database } from './database/database';
import { SettingsRepository } from './database/settings-repository';
import { createSenderGuard, dispatchIpc, type IpcHandlers } from './ipc/router';
import { hardenWindow, lockDownPermissions, secureWebPreferences } from './security/window';
import { createSystemMetricsService } from './services/system-metrics';
import { SecretStore, type Encryptor } from './database/secret-store';
import { ProviderSettingsRepository } from './database/provider-settings-repository';
import { MemoryConversationStore, SqliteConversationStore } from './database/conversation-store';
import { AiService } from './services/ai-service';
import { ChatService } from './services/chat-service';
import { VoiceService } from './services/voice-service';

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
  const persistentStore = new SqliteConversationStore(database);
  const recovered = persistentStore.recoverInterrupted();
  if (recovered > 0) logger.warn('chat.recovered_interrupted', { count: recovered });
  const chat = new ChatService({
    stores: { persistent: persistentStore, memory: new MemoryConversationStore() },
    saveHistory: () => settings.getAll().saveHistory,
    resolveProvider: () => ai.resolve(),
    emit: emitChatEvent,
    logger,
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
