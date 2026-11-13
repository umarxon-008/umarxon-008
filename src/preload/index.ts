import { contextBridge, ipcRenderer } from 'electron';
import type { MariusApi } from './api';

/**
 * Preload: sandbox ichida ishlaydi. Faqat aniq nomlangan funksiyalarni ochadi.
 * ipcRenderer'ning o'zi renderer'ga berilmaydi. Validatsiya main process'da.
 */
const api: MariusApi = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
  },
  logs: {
    openFolder: () => ipcRenderer.invoke('logs:openFolder'),
  },
};

contextBridge.exposeInMainWorld('marius', Object.freeze(api));
