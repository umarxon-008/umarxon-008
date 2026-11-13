import type {
  ActionResult,
  AppEntry,
  AuditEntry,
  ComputerInfo,
  ConfirmationRequest,
  WindowEntry,
  AiSettings,
  AiSettingsPatch,
  AppInfo,
  ChatEvent,
  ChatMessage,
  ChatSendResult,
  ConnectionTest,
  Conversation,
  ConversationSummary,
  IpcResult,
  ProviderId,
  Settings,
  SettingsPatch,
  SynthesizeResult,
  SystemMetrics,
} from '../shared/ipc';

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
  ai: {
    getSettings(): Promise<IpcResult<AiSettings>>;
    updateSettings(patch: AiSettingsPatch): Promise<IpcResult<AiSettings>>;
    /** Kalit faqat main process'ga yuboriladi va u yerda shifrlanadi. Qaytarib o'qib bo'lmaydi. */
    setGeminiKey(key: string): Promise<IpcResult<AiSettings>>;
    deleteGeminiKey(): Promise<IpcResult<AiSettings>>;
    testConnection(provider: ProviderId): Promise<IpcResult<ConnectionTest>>;
  };
  chat: {
    listConversations(): Promise<IpcResult<ConversationSummary[]>>;
    getConversation(id: string): Promise<IpcResult<Conversation>>;
    send(conversationId: string | null, text: string): Promise<IpcResult<ChatSendResult>>;
    regenerate(
      conversationId: string,
    ): Promise<IpcResult<{ requestId: string; assistantMessage: ChatMessage }>>;
    cancel(requestId: string): Promise<IpcResult<boolean>>;
    deleteConversation(id: string): Promise<IpcResult<void>>;
    clearAll(): Promise<IpcResult<void>>;
    /** Javob oqimi hodisalari. Obunani bekor qiluvchi funksiya qaytaradi. */
    onEvent(listener: (event: ChatEvent) => void): () => void;
  };
  tools: {
    /** Tasdiq kartasiga javob: faqat foydalanuvchining haqiqiy bosishi orqali */
    respond(id: string, approved: boolean): Promise<IpcResult<boolean>>;
    onConfirmationRequest(listener: (request: ConfirmationRequest) => void): () => void;
  };
  audit: {
    list(limit: number): Promise<IpcResult<AuditEntry[]>>;
    clear(): Promise<IpcResult<void>>;
  };
  computer: {
    info(): Promise<IpcResult<ComputerInfo>>;
    listApps(refresh: boolean): Promise<IpcResult<AppEntry[]>>;
    launchApp(appId: string): Promise<IpcResult<ActionResult>>;
    listWindows(): Promise<IpcResult<WindowEntry[]>>;
    focusWindow(pid: number): Promise<IpcResult<ActionResult>>;
  };
  voice: {
    /** 16 kHz mono WAV (base64). Faqat rozilik berilgan bo'lsa Gemini'ga yuboriladi. */
    transcribe(audioBase64: string): Promise<IpcResult<{ text: string }>>;
    synthesize(text: string): Promise<IpcResult<SynthesizeResult>>;
  };
}

declare global {
  interface Window {
    marius: MariusApi;
  }
}
