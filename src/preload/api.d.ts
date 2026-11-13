import type { AppInfo, IpcResult, Settings, SettingsPatch, SystemMetrics } from '../shared/ipc';

/** Renderer'ga ochilgan yagona API. Boshqa hech qanday OS kirish yo'li yo'q. */
export interface MariusApi {
  app: {
    getInfo(): Promise<IpcResult<AppInfo>>;
  };
  system: {
    getMetrics(): Promise<IpcResult<SystemMetrics>>;
  };
  settings: {
    getAll(): Promise<IpcResult<Settings>>;
    update(patch: SettingsPatch): Promise<IpcResult<Settings>>;
  };
  logs: {
    openFolder(): Promise<IpcResult<void>>;
  };
}

declare global {
  interface Window {
    marius: MariusApi;
  }
}
