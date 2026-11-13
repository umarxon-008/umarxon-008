import { create } from 'zustand';
import type { ChatEvent, ChatMessage, ConversationSummary, ToolActivity } from '@shared/ipc';

interface Streaming {
  requestId: string;
  conversationId: string;
  messageId: string;
}

interface ChatState {
  conversations: ConversationSummary[];
  activeId: string | null;
  messages: ChatMessage[];
  /** Kompyuter amallari kartalari (audit jurnalidan) */
  activities: ToolActivity[];
  streaming: Streaming | null;
  sending: boolean;
  /** Oxirgi javob xatosi (qayta urinish tugmasi bilan) */
  failure: { message: string; retryable: boolean } | null;
  /** IPC darajasidagi xato (masalan, AI sozlanmagan) */
  error: string | null;
  loadList(): Promise<void>;
  open(id: string): Promise<void>;
  startNew(): void;
  send(text: string): Promise<boolean>;
  cancel(): Promise<void>;
  regenerate(): Promise<void>;
  remove(id: string): Promise<void>;
  clearAll(): Promise<void>;
  handleEvent(e: ChatEvent): void;
}

export const useChat = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  activities: [],
  streaming: null,
  sending: false,
  failure: null,
  error: null,

  async loadList() {
    const r = await window.marius.chat.listConversations();
    if (r.ok) set({ conversations: r.data });
    else set({ error: r.error.message });
  },

  async open(id) {
    const r = await window.marius.chat.getConversation(id);
    if (!r.ok) {
      set({ error: r.error.message });
      return;
    }
    const last = r.data.messages.at(-1);
    set({
      activeId: id,
      messages: r.data.messages,
      activities: r.data.activities,
      error: null,
      failure:
        last?.role === 'assistant' && last.status === 'error'
          ? { message: 'Oxirgi javob xato bilan tugagan.', retryable: true }
          : null,
    });
  },

  startNew() {
    set({ activeId: null, messages: [], activities: [], failure: null, error: null });
  },

  async send(text) {
    const { activeId, streaming } = get();
    if (streaming) return false;
    set({ sending: true, error: null, failure: null });
    const r = await window.marius.chat.send(activeId, text);
    set({ sending: false });
    if (!r.ok) {
      set({ error: r.error.message });
      return false;
    }
    const { conversationId, requestId, userMessage, assistantMessage } = r.data;
    set((s) => ({
      activeId: conversationId,
      messages:
        s.activeId === conversationId
          ? [...s.messages, userMessage, assistantMessage]
          : [userMessage, assistantMessage],
      activities: s.activeId === conversationId ? s.activities : [],
      streaming: { requestId, conversationId, messageId: assistantMessage.id },
    }));
    void get().loadList();
    return true;
  },

  async cancel() {
    const s = get().streaming;
    if (s) await window.marius.chat.cancel(s.requestId);
  },

  async regenerate() {
    const { activeId, streaming } = get();
    if (!activeId || streaming) return;
    set({ failure: null, error: null });
    const r = await window.marius.chat.regenerate(activeId);
    if (!r.ok) {
      set({ error: r.error.message });
      return;
    }
    const { requestId, assistantMessage } = r.data;
    set((s) => {
      const msgs = [...s.messages];
      if (msgs.at(-1)?.role === 'assistant') msgs.pop();
      return {
        messages: [...msgs, assistantMessage],
        streaming: { requestId, conversationId: activeId, messageId: assistantMessage.id },
      };
    });
  },

  async remove(id) {
    await window.marius.chat.deleteConversation(id);
    if (get().activeId === id) get().startNew();
    await get().loadList();
  },

  async clearAll() {
    await window.marius.chat.clearAll();
    get().startNew();
    set({ streaming: null });
    await get().loadList();
  },

  handleEvent(e) {
    const patchMessage = (fn: (m: ChatMessage) => ChatMessage) =>
      set((s) => ({ messages: s.messages.map((m) => (m.id === e.messageId ? fn(m) : m)) }));

    if (e.type === 'tool') {
      if (get().activeId !== e.conversationId) return;
      set((s) => {
        const i = s.activities.findIndex((a) => a.id === e.activity.id);
        if (i === -1) return { activities: [...s.activities, e.activity] };
        const next = [...s.activities];
        next[i] = e.activity;
        return { activities: next };
      });
      return;
    }
    if (e.type === 'delta') {
      patchMessage((m) => ({ ...m, content: m.content + e.text }));
      return;
    }
    if (e.type === 'done') {
      patchMessage((m) => ({ ...m, status: e.status }));
    } else {
      patchMessage((m) => ({ ...m, status: 'error', errorCode: e.code }));
      if (get().activeId === e.conversationId)
        set({ failure: { message: e.message, retryable: e.retryable } });
    }
    if (get().streaming?.requestId === e.requestId) set({ streaming: null });
    void get().loadList();
  },
}));

// Main process'dan keladigan oqim hodisalariga bir marta obuna bo'linadi.
window.marius.chat.onEvent((e) => useChat.getState().handleEvent(e));
