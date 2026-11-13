import { create } from 'zustand';
import type { Settings, SettingsPatch } from '@shared/ipc';

type Status = 'loading' | 'ready' | 'error';

interface SettingsState {
  status: Status;
  settings: Settings | null;
  error: string | null;
  load(): Promise<void>;
  update(patch: SettingsPatch): Promise<boolean>;
}

/** Sozlamalarning yagona manbasi main process. Bu store faqat uning nusxasini saqlaydi. */
export const useSettings = create<SettingsState>((set) => ({
  status: 'loading',
  settings: null,
  error: null,

  async load() {
    set({ status: 'loading', error: null });
    const result = await window.marius.settings.getAll();
    if (result.ok) set({ status: 'ready', settings: result.data });
    else set({ status: 'error', error: result.error.message });
  },

  async update(patch) {
    const result = await window.marius.settings.update(patch);
    if (result.ok) {
      set({ settings: result.data, error: null });
      return true;
    }
    set({ error: result.error.message });
    return false;
  },
}));
