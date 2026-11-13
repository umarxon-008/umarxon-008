import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { ChatEvent } from '../shared/ipc';
import type { MariusApi } from './api';

// Sandbox'dagi preload faqat 'electron' modulini import qila oladi, shuning uchun kanal nomi shu yerda.
const CHAT_EVENT_CHANNEL = 'chat:event';

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
  voice: {
    transcribe: (audio) => ipcRenderer.invoke('voice:transcribe', { audio, mimeType: 'audio/wav' }),
    synthesize: (text) => ipcRenderer.invoke('voice:synthesize', { text }),
  },
};

contextBridge.exposeInMainWorld('marius', Object.freeze(api));
