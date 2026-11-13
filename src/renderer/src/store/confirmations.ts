import { create } from 'zustand';
import type { ConfirmationRequest } from '@shared/ipc';

interface ConfirmationState {
  queue: ConfirmationRequest[];
  responding: boolean;
  respond(id: string, approved: boolean): Promise<void>;
}

/** Main process'dan kelgan tasdiq so'rovlari navbati (bir vaqtda bittasi ko'rsatiladi). */
export const useConfirmations = create<ConfirmationState>((set, get) => ({
  queue: [],
  responding: false,
  async respond(id, approved) {
    if (get().responding) return;
    set({ responding: true });
    await window.marius.tools.respond(id, approved);
    set((s) => ({ responding: false, queue: s.queue.filter((r) => r.id !== id) }));
  },
}));

window.marius.tools.onConfirmationRequest((request) => {
  useConfirmations.setState((s) => ({ queue: [...s.queue, request] }));
});
