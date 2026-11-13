import { create } from 'zustand';
import type { AiSettings, AiSettingsPatch, ConnectionTest, ProviderId } from '@shared/ipc';

interface AiState {
  settings: AiSettings | null;
  error: string | null;
  testing: ProviderId | null;
  tests: Partial<Record<ProviderId, ConnectionTest>>;
  load(): Promise<void>;
  update(patch: AiSettingsPatch): Promise<boolean>;
  setGeminiKey(key: string): Promise<boolean>;
  deleteGeminiKey(): Promise<boolean>;
  test(provider: ProviderId): Promise<ConnectionTest | null>;
}

export const useAi = create<AiState>((set) => {
  const apply = (r: Awaited<ReturnType<typeof window.marius.ai.getSettings>>): boolean => {
    if (r.ok) set({ settings: r.data, error: null });
    else set({ error: r.error.message });
    return r.ok;
  };
  return {
    settings: null,
    error: null,
    testing: null,
    tests: {},
    load: async () => void apply(await window.marius.ai.getSettings()),
    update: async (patch) => apply(await window.marius.ai.updateSettings(patch)),
    setGeminiKey: async (key) => apply(await window.marius.ai.setGeminiKey(key)),
    deleteGeminiKey: async () => {
      const ok = apply(await window.marius.ai.deleteGeminiKey());
      if (ok) set((s) => ({ tests: { ...s.tests, gemini: undefined } }));
      return ok;
    },
    test: async (provider) => {
      set({ testing: provider });
      const r = await window.marius.ai.testConnection(provider);
      set({ testing: null });
      if (!r.ok) {
        set({ error: r.error.message });
        return null;
      }
      set((s) => ({ tests: { ...s.tests, [provider]: r.data } }));
      return r.data;
    },
  };
});

/** Chat ishlashi uchun sozlama yetarlimi */
export function isAiReady(s: AiSettings | null): boolean {
  if (!s?.provider) return false;
  if (s.provider === 'gemini') return s.gemini.hasKey && Boolean(s.gemini.model);
  return Boolean(s.ollama.model);
}
