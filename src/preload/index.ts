import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ChatEvent, ConfirmationRequest } from '../shared/ipc';
import type { MariusApi } from './api';

// Sandbox'dagi preload faqat 'electron' modulini import qila oladi, shuning uchun kanal nomi shu yerda.
const CHAT_EVENT_CHANNEL = 'chat:event';
const TOOL_CONFIRM_CHANNEL = 'tool:confirm';

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
  voice: {
    transcribe: (audio) => ipcRenderer.invoke('voice:transcribe', { audio, mimeType: 'audio/wav' }),
    synthesize: (text) => ipcRenderer.invoke('voice:synthesize', { text }),
  },
};

contextBridge.exposeInMainWorld('marius', Object.freeze(api));
