import type {
  ActionResult,
  MediaAction,
  ProcessGroup,
  ObsidianStatus,
  MemoryItem,
  Reminder,
  ReminderEvent,
  AllowedFolderInfo,
  FileHitInfo,
  FolderKey,
  FolderSuggestion,
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
    /** Task Manager kabi: dasturlar, RAM va CPU (taxminan 1.5 soniya) */
    listProcesses(
      sortBy: 'memory' | 'cpu',
    ): Promise<IpcResult<{ groups: ProcessGroup[]; memoryTotalBytes: number }>>;
    /** Dasturni yopish: tasdiq oynasidan keyin. force — majburan */
    closeApp(name: string, force: boolean): Promise<IpcResult<ActionResult>>;
    /** Allowlist'dagi media/ovoz tugmasi (1–10 marta) */
    media(action: MediaAction, steps: number): Promise<IpcResult<ActionResult>>;
  };
  files: {
    listFolders(): Promise<IpcResult<AllowedFolderInfo[]>>;
    suggestions(): Promise<IpcResult<FolderSuggestion[]>>;
    /** Papka faqat tizim dialogi yoki standart papkalar orqali qo'shiladi */
    addFolderFromDialog(): Promise<IpcResult<AllowedFolderInfo[]>>;
    addSuggestedFolder(key: FolderKey): Promise<IpcResult<AllowedFolderInfo[]>>;
    removeFolder(id: string): Promise<IpcResult<AllowedFolderInfo[]>>;
    search(q: {
      query?: string;
      extension?: string;
      folderId?: string;
      modifiedWithinDays?: number;
    }): Promise<IpcResult<{ results: FileHitInfo[]; scanned: number; truncated: boolean }>>;
    open(path: string): Promise<IpcResult<ActionResult>>;
    showInFolder(path: string): Promise<IpcResult<ActionResult>>;
  };
  youtube: {
    status(): Promise<IpcResult<{ hasKey: boolean; secretStorageAvailable: boolean }>>;
    /** Kalit main process'da shifrlanadi va sinov qidiruvi bilan tekshiriladi */
    setKey(key: string): Promise<IpcResult<ConnectionTest>>;
    deleteKey(): Promise<IpcResult<void>>;
  };
  memory: {
    list(): Promise<IpcResult<MemoryItem[]>>;
    create(content: string): Promise<IpcResult<MemoryItem[]>>;
    update(id: string, content: string): Promise<IpcResult<MemoryItem[]>>;
    delete(id: string): Promise<IpcResult<MemoryItem[]>>;
    clear(): Promise<IpcResult<void>>;
  };
  reminders: {
    list(): Promise<IpcResult<Reminder[]>>;
    create(r: { title: string; description?: string; dueAt: string }): Promise<IpcResult<Reminder[]>>;
    update(r: {
      id: string;
      title?: string;
      description?: string | null;
      dueAt?: string;
    }): Promise<IpcResult<Reminder[]>>;
    setStatus(id: string, status: Reminder['status']): Promise<IpcResult<Reminder[]>>;
    delete(id: string): Promise<IpcResult<Reminder[]>>;
    onEvent(listener: (event: ReminderEvent) => void): () => void;
  };
  obsidian: {
    status(): Promise<IpcResult<ObsidianStatus>>;
    update(
      patch: Partial<Pick<ObsidianStatus, 'enabled' | 'read' | 'create' | 'append'>>,
    ): Promise<IpcResult<ObsidianStatus>>;
    chooseVault(mode: 'existing' | 'create'): Promise<IpcResult<ObsidianStatus>>;
    disconnect(): Promise<IpcResult<ObsidianStatus>>;
    open(): Promise<IpcResult<void>>;
    clearIndex(): Promise<IpcResult<ObsidianStatus>>;
  };
  data: {
    backup(): Promise<IpcResult<{ saved: boolean; path: string | null; message: string }>>;
    restore(): Promise<IpcResult<{ scheduled: boolean; message: string }>>;
  };
  vision: {
    /** Tasdiq oynasidan keyin bitta ekran rasmi olinadi va tahlil qilinadi. Rasm saqlanmaydi. */
    analyzeScreen(
      question: string,
    ): Promise<IpcResult<{ ok: boolean; message: string; description: string | null }>>;
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
