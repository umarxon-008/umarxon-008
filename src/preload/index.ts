import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ChatEvent, ConfirmationRequest, ReminderEvent } from '../shared/ipc';
import type { MariusApi } from './api';

// Sandbox'dagi preload faqat 'electron' modulini import qila oladi, shuning uchun kanal nomi shu yerda.
const CHAT_EVENT_CHANNEL = 'chat:event';
const TOOL_CONFIRM_CHANNEL = 'tool:confirm';
const REMINDER_EVENT_CHANNEL = 'reminders:event';

/**
 * Preload: sandbox ichida ishlaydi. Faqat aniq nomlangan funksiyalarni ochadi.
 * ipcRenderer'ning o'zi renderer'ga berilmaydi. Validatsiya main process'da.
 */
const api: MariusApi = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
  },
  system: {
    getMetrics: () => ipcRenderer.invoke('system:getMetrics'),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
  },
  logs: {
    openFolder: () => ipcRenderer.invoke('logs:openFolder'),
  },
  ai: {
    getSettings: () => ipcRenderer.invoke('ai:getSettings'),
    updateSettings: (patch) => ipcRenderer.invoke('ai:updateSettings', patch),
    setGeminiKey: (key) => ipcRenderer.invoke('ai:setGeminiKey', { key }),
    deleteGeminiKey: () => ipcRenderer.invoke('ai:deleteGeminiKey'),
    testConnection: (provider) => ipcRenderer.invoke('ai:testConnection', { provider }),
    findGeminiModel: () => ipcRenderer.invoke('ai:findGeminiModel'),
  },
  chat: {
    listConversations: () => ipcRenderer.invoke('chat:listConversations'),
    getConversation: (id) => ipcRenderer.invoke('chat:getConversation', { id }),
    send: (conversationId, text) => ipcRenderer.invoke('chat:send', { conversationId, text }),
    regenerate: (conversationId) => ipcRenderer.invoke('chat:regenerate', { conversationId }),
    cancel: (requestId) => ipcRenderer.invoke('chat:cancel', { requestId }),
    deleteConversation: (id) => ipcRenderer.invoke('chat:deleteConversation', { id }),
    clearAll: () => ipcRenderer.invoke('chat:clearAll'),
    onEvent: (listener) => {
      // IpcRendererEvent obyekti renderer'ga berilmaydi, faqat ma'lumot
      const handler = (_e: IpcRendererEvent, event: ChatEvent) => listener(event);
      ipcRenderer.on(CHAT_EVENT_CHANNEL, handler);
      return () => ipcRenderer.removeListener(CHAT_EVENT_CHANNEL, handler);
    },
  },
  tools: {
    respond: (id, approved) => ipcRenderer.invoke('tools:respond', { id, approved }),
    onConfirmationRequest: (listener) => {
      const handler = (_e: IpcRendererEvent, request: ConfirmationRequest) => listener(request);
      ipcRenderer.on(TOOL_CONFIRM_CHANNEL, handler);
      return () => ipcRenderer.removeListener(TOOL_CONFIRM_CHANNEL, handler);
    },
  },
  audit: {
    list: (limit) => ipcRenderer.invoke('audit:list', { limit }),
    clear: () => ipcRenderer.invoke('audit:clear'),
  },
  computer: {
    info: () => ipcRenderer.invoke('computer:info'),
    listApps: (refresh) => ipcRenderer.invoke('computer:listApps', { refresh }),
    launchApp: (appId) => ipcRenderer.invoke('computer:launchApp', { appId }),
    listWindows: () => ipcRenderer.invoke('computer:listWindows'),
    focusWindow: (pid) => ipcRenderer.invoke('computer:focusWindow', { pid }),
    listProcesses: (sortBy) => ipcRenderer.invoke('computer:listProcesses', { sortBy }),
    closeApp: (name, force) => ipcRenderer.invoke('computer:closeApp', { name, force }),
    media: (action, steps) => ipcRenderer.invoke('computer:media', { action, steps }),
  },
  files: {
    listFolders: () => ipcRenderer.invoke('files:listFolders'),
    suggestions: () => ipcRenderer.invoke('files:suggestions'),
    addFolderFromDialog: () => ipcRenderer.invoke('files:addFolder', { source: 'dialog' }),
    addSuggestedFolder: (key) => ipcRenderer.invoke('files:addFolder', { source: 'suggestion', key }),
    removeFolder: (id) => ipcRenderer.invoke('files:removeFolder', { id }),
    search: (q) => ipcRenderer.invoke('files:search', q),
    open: (path) => ipcRenderer.invoke('files:open', { path }),
    showInFolder: (path) => ipcRenderer.invoke('files:showInFolder', { path }),
  },
  youtube: {
    status: () => ipcRenderer.invoke('youtube:status'),
    setKey: (key) => ipcRenderer.invoke('youtube:setKey', { key }),
    deleteKey: () => ipcRenderer.invoke('youtube:deleteKey'),
  },
  memory: {
    list: () => ipcRenderer.invoke('memory:list'),
    create: (content) => ipcRenderer.invoke('memory:create', { content }),
    update: (id, content) => ipcRenderer.invoke('memory:update', { id, content }),
    delete: (id) => ipcRenderer.invoke('memory:delete', { id }),
    clear: () => ipcRenderer.invoke('memory:clear'),
  },
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
    create: (r) => ipcRenderer.invoke('reminders:create', r),
    update: (r) => ipcRenderer.invoke('reminders:update', r),
    setStatus: (id, status) => ipcRenderer.invoke('reminders:setStatus', { id, status }),
    delete: (id) => ipcRenderer.invoke('reminders:delete', { id }),
    onEvent: (listener) => {
      const handler = (_e: IpcRendererEvent, event: ReminderEvent) => listener(event);
      ipcRenderer.on(REMINDER_EVENT_CHANNEL, handler);
      return () => ipcRenderer.removeListener(REMINDER_EVENT_CHANNEL, handler);
    },
  },
  obsidian: {
    status: () => ipcRenderer.invoke('obsidian:status'),
    update: (patch) => ipcRenderer.invoke('obsidian:update', patch),
    chooseVault: (mode) => ipcRenderer.invoke('obsidian:chooseVault', { mode }),
    disconnect: () => ipcRenderer.invoke('obsidian:disconnect'),
    open: () => ipcRenderer.invoke('obsidian:open'),
    clearIndex: () => ipcRenderer.invoke('obsidian:clearIndex'),
  },
  data: {
    backup: () => ipcRenderer.invoke('data:backup'),
    restore: () => ipcRenderer.invoke('data:restore'),
  },
  vision: {
    analyzeScreen: (question) => ipcRenderer.invoke('vision:analyzeScreen', { question }),
  },
  voice: {
    transcribe: (audio) => ipcRenderer.invoke('voice:transcribe', { audio, mimeType: 'audio/wav' }),
    synthesize: (text) => ipcRenderer.invoke('voice:synthesize', { text }),
  },
};

contextBridge.exposeInMainWorld('marius', Object.freeze(api));
