# MARIUS — Arxitektura

**Holat:** Tasdiqlangan (2026-11-13). PHASE 1 da amalga oshirilgan qarorlar §1.3 da.

---

## 1. Texnologiya tanlovi

### 1.1 Desktop framework: **Electron + React + TypeScript** (tavsiya)

| Mezon | Electron | Tauri |
|---|---|---|
| Paket hajmi | Katta (~90–120 MB installer) | Kichik (~10–20 MB) |
| Windows integratsiyasi | Node.js ekotizimi: `systeminformation`, `child_process`, Electron `Notification`, `safeStorage` (DPAPI) | Rust crate'lar orqali kuchli, lekin Rust bilimi kerak |
| Til | Hamma joyda bitta til: TypeScript | Frontend TS, backend **Rust** |
| Mikrofon va audio | Chromium `MediaRecorder` / `getUserMedia` barqaror | WebView2 orqali ishlaydi, ba'zi nozik holatlar bor |
| Xavfsizlik modeli | `contextIsolation`, `sandbox`, preload: yaxshi hujjatlashtirilgan | Default holatda qattiqroq (capabilities tizimi) |
| Ishlab chiqish tezligi | Yuqori | O'rtacha |
| Installer | `electron-builder` NSIS: tayyor uninstall, shortcut, tanlanadigan papka | `tauri bundler` NSIS/MSI |

**Qaror:** Electron. Asosiy sabablar: yagona til (TypeScript), Windows uchun DPAPI'ni beradigan `safeStorage` bevosita mavjud, audio/mikrofon barqaror va ekotizim katta. Kamchiligi paket hajmining kattaligi; MVP uchun bu qabul qilinadi. Bu qaror tasdiqlangandan keyin sababsiz o'zgartirilmaydi.

### 1.2 Stack

| Qatlam | Tanlov | Izoh |
|---|---|---|
| Build | `electron-vite` + Vite | main / preload / renderer uchun alohida bundle |
| UI | React 19 + TypeScript (strict) | |
| Styling | Oddiy CSS + CSS custom properties (design tokens: `styles/tokens.css`) | Og'ir UI kutubxonasisiz, to'liq nazorat |
| Routing | `react-router` (hash router) | `file://` muhitida ham ishlaydi |
| State | Zustand (UI holati), main process (haqiqiy ma'lumot) | |
| Validatsiya | `zod` | IPC payload, tool argumentlari, AI tool chaqiriqlari |
| Ma'lumotlar bazasi | SQLite: `better-sqlite3` yoki Node'ning ichki `node:sqlite` moduli | PHASE 1 da ikkalasi sinab ko'riladi (pastdagi izohga qarang) |
| Secret saqlash | Electron `safeStorage` (Windows'da DPAPI) | Shifrlangan blob DB'da, kalitning o'zi hech qachon ochiq saqlanmaydi |
| Tizim ma'lumoti | `systeminformation` | CPU, RAM, disk, batareya |
| Logging | Main'da strukturali JSON log, redaction filtri bilan | |
| Test | Vitest (unit/integration), Playwright for Electron (E2E) | |
| Lint/format | ESLint + Prettier | |
| Installer | `electron-builder` → NSIS `.exe` | |
| CI | GitHub Actions: `windows-latest` | Windows'da build, test va installer |

**SQLite izohi:** `better-sqlite3` native modul, shuning uchun Electron uchun qayta build qilinishi kerak va bu Windows CI'da qo'shimcha qadamni talab qiladi. `node:sqlite` Electron'ning Node runtime'iga kiritilgan bo'lsa, native build umuman kerak bo'lmaydi. Qaror PHASE 1 dagi spike natijasiga qarab qabul qilinadi va `ARCHITECTURE.md` da qayd etiladi.

**TypeScript izohi:** TS 7 (native kompilyator) eng yangi versiya. ESLint va electron-vite bilan mosligi PHASE 1 da tekshiriladi. Muammo chiqsa, 5.x/6.x qatoridagi barqaror versiya qotiriladi.

### 1.3 Qabul qilingan qarorlar (PHASE 1)

| Qaror | Natija | Sabab |
|---|---|---|
| Desktop framework | **Electron 45** | Foydalanuvchi tasdiqladi |
| SQLite drayveri | **`node:sqlite`** (Electron 45 ichidagi Node 24, SQLite 3.53) | Spike muvaffaqiyatli o'tdi: native modul yo'q, Windows build sodda (R-08 yopildi) |
| TypeScript | **6.0.x** | `typescript-eslint` TS 7 ni hali qo'llamaydi (`<6.1.0`) |
| Build | electron-vite 6 + Vite 8, `@vitejs/plugin-react` 6 | |
| Paket menejeri | **npm** | Windows'da foydalanuvchi uchun eng sodda yo'l |
| AI provayderlar | **Google Gemini (bepul API kalit)** + **Ollama (lokal, bepul)** | Foydalanuvchi tanlovi, ikkalasi ham. PHASE 2 da |
| Renderer kutubxonalari | `devDependencies` da | Vite ularni bundle'ga qo'shadi; installer'da faqat `zod` qoladi |
| CSP | Build vaqtida HTML'ga qo'yiladi (prod: inline script yo'q) | `electron.vite.config.mts` |

## 2. Jarayonlar modeli va xavfsizlik chegaralari

```
┌──────────────────────────────────────────────────────────────┐
│ RENDERER (React UI) — ishonchsiz zona                         │
│  • Node API yo'q, fayl tizimi yo'q, shell yo'q                │
│  • Faqat window.marius.* (preload) chaqiradi                  │
└───────────────▲──────────────────────────────────────────────┘
                │ contextBridge (faqat ruxsat etilgan funksiyalar)
┌───────────────┴──────────────────────────────────────────────┐
│ PRELOAD — yupqa, typed API; har bir channel allowlist'da      │
└───────────────▲──────────────────────────────────────────────┘
                │ ipcRenderer.invoke(channel, payload)
┌───────────────┴──────────────────────────────────────────────┐
│ MAIN PROCESS — ishonchli zona                                 │
│  IPC Router ─► zod validatsiya ─► Application Services         │
│                                    │                           │
│   AI Brain ─► Tool Router ─► Permission Policy ─► Confirmation │
│                                    │            (UI orqali)    │
│                              Tool Executor ─► Result Verifier  │
│                                    │                           │
│               Audit Log ◄──────────┘                           │
│   Infrastructure: DB, SecretStore, Providers (AI/STT/TTS)      │
│   OS Adapters: apps, windows, files, system, notifications     │
└──────────────────────────────────────────────────────────────┘
```

**Electron sozlamalari (majburiy):** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, qat'iy CSP (`default-src 'self'`; AI so'rovlari renderer'dan emas, main'dan yuboriladi), `setWindowOpenHandler` → tashqi havolalar faqat `shell.openExternal` orqali va faqat `https:` uchun, `will-navigate` bloklanadi, remote content yuklanmaydi.

## 3. Arxitektura qatlamlari

1. **Presentation/UI:** `src/renderer`, faqat ko'rsatish va foydalanuvchi bilan ishlash.
2. **Application/use cases:** `src/main/services`, masalan `ChatService`, `ReminderService`, `FileSearchService`.
3. **Domain va policy:** `src/shared` + `src/main/security`: modellar, `PermissionPolicy`, `ToolManifest`.
4. **Infrastructure/providers:** `src/modules/ai`, `speech` va boshqalar; har biri adapter interfeysi orqali ishlaydi.
5. **OS adapters:** `src/main/windows`; Windows'ga xos kod shu yerda izolyatsiya qilinadi.

Qoida: UI komponentlari OS'ga to'g'ridan-to'g'ri murojaat qilmaydi. Har bir amal service va policy qatlamidan o'tadi.

## 4. Papkalar tuzilmasi (reja)

```
/src
  /main          app/, ipc/, security/, windows/, services/, database/, logging/
  /preload       index.ts (contextBridge API)
  /renderer      app/, components/, pages/, features/{assistant,voice,memory,tasks,
                 computer,settings,monitoring}, styles/ (tokens.css)
  /shared        types/, schemas/ (zod), contracts/ (IPC kanallari)
  /modules       ai/, speech/, memory/, tools/, browser/, files/, reminders/, vision/
/tests           unit/, integration/, e2e/, fixtures/ (prompt-injection va boshqalar)
/docs
/scripts
/resources       icon.ico, installer resurslari
```

## 5. AI Brain

```
Foydalanuvchi matni
  → ConversationManager (kontekst, tarix, maxfiylik filtri)
  → Provider.sendMessage / streamMessage + registry'dagi tool'lar ta'rifi
  → Model javobi: matn | tool_use
  → ToolRouter: tool ro'yxatda bormi? → zod bilan argument tekshiruvi
  → PermissionPolicy: daraja (0–4) → tasdiq kerakmi?
  → (kerak bo'lsa) ConfirmationCard: UI'dagi real bosish
  → ToolExecutor (timeout, cancel) → ResultVerifier
  → AuditLog
  → natija modelga qaytariladi → ResponseComposer (o'zbekcha javob)
```

- **Intent:** alohida klassifikator emas, provider'ning tool/function calling imkoniyati ishlatiladi. Aniq bo'lmagan holat uchun maxsus `ask_clarification` tool'i bor. Intent natijasiga ko'r-ko'rona ishonilmaydi: har bir argument tool qatlamida qayta tekshiriladi.
- **Planner (MVP):** ko'p bosqichli tool chaqiriqlari loop orqali bajariladi (maksimal qadamlar soni, masalan 8). Har bir qadam UI'da "Tool activity card" bo'lib ko'rinadi va to'xtatiladi. Murakkab planner V3 da.
- **Prompt injection:** tool natijalari, fayl mazmuni, sahifa va ekran matni modelga `untrusted` belgisi bilan beriladi. Model "foydalanuvchi ruxsat berdi" desa ham, tasdiq faqat UI'dagi haqiqiy bosishdan olinadi.

### Provider interfeysi

```ts
interface AIProvider {
  id: string;
  getCapabilities(): ProviderCapabilities; // streaming, tools, vision
  healthCheck(signal): Promise<HealthResult>;
  sendMessage(req, signal): Promise<AIResponse>;
  streamMessage?(req, signal): AsyncIterable<AIStreamEvent>;
}
```

Birinchi adapterlar foydalanuvchi tanloviga ko'ra yoziladi (masalan, Anthropic Claude Messages API va/yoki OpenAI-mos API). Model nomlari kodga qattiq yozilmaydi: ular Settings'da tanlanadi, default qiymat esa PHASE 2 da provider hujjatidan tekshirib qo'yiladi.

## 6. Tool registry va ruxsatlar

```ts
interface ToolManifest<I, O> {
  id: string; name: string; version: string; description: string;
  permissionLevel: 0 | 1 | 2 | 3;          // 4 = taqiqlangan, registry'ga kirmaydi
  confirmation: 'never' | 'always' | 'on-overwrite' | 'bulk';
  inputSchema: ZodType<I>; outputSchema: ZodType<O>;
  timeoutMs: number; cancellable: boolean;
  audit: { redactArgs: string[] };
  execute(input: I, ctx: ToolContext): Promise<ToolResult<O>>;
}
```

| Tool | Daraja | Tasdiq |
|---|---|---|
| getSystemInfo, getDiskUsage, getBatteryStatus | 0 | yo'q |
| listInstalledApps, listVisibleWindows | 1 | yo'q |
| searchFiles (ruxsatli papkalarda) | 1 | yo'q |
| launchApp, focusWindow, openFile, openUrl/search | 2 | birinchi versiyada `always` (keyin sozlanadi) |
| createFolder, copyFile | 2 | `always` |
| renameFile, moveFile, ustidan yozish | 3 | `always` + preview |
| captureScreen → cloud | 3 | `always` + maxfiylik ogohlantirishi |
| Ixtiyoriy shell, o'chirish, admin amallar | 4 | **registry'da mavjud emas** |

- Tasdiq bir martalik. `permission_grants` jadvalida faqat foydalanuvchi Settings'da ataylab yoqgan doimiy ruxsatlar saqlanadi.
- **Windows amallari:** AI hech qachon shell buyrug'i yaratmaydi. OS adapterlari oldindan yozilgan, parametrlari qat'iy PowerShell/Win32 chaqiriqlarini ishlatadi; argumentlar `-Command` qatoriga qo'shib yozilmaydi, alohida va escape qilingan holda beriladi.
- **Dastur ochish:** Start Menu `.lnk` va App Paths'dan ro'yxat tuziladi. AI'ga faqat ro'yxatdagi identifikatorlar ko'rsatiladi. Tasodifiy `.exe` yo'li qabul qilinmaydi.
- **Fayllar:** har bir path `realpath` orqali normallashtiriladi va ruxsat etilgan ildiz ichida ekani tekshiriladi. Symlink/junction (reparse point) tashqariga olib chiqsa, path bloklanadi.

## 7. Voice engine

State machine: `IDLE → LISTENING → TRANSCRIBING → (tahrir) → THINKING → AWAITING_CONFIRMATION? → EXECUTING → SPEAKING → IDLE`, istalgan holatdan `ERROR` ga o'tish mumkin. Bir vaqtda faqat bitta audio jarayon ishlaydi. Mikrofon renderer'da `getUserMedia` orqali faqat push-to-talk paytida yoqiladi. Audio main'ga uzatiladi va STT adapteriga beriladi.

STT/TTS nomzodlari (o'zbek tilini qo'llashi **PHASE 3 da test bilan tasdiqlanadi**): OpenAI Whisper API, lokal whisper.cpp (maxfiylik uchun yaxshi, ammo tezligi va sifati tekshirilishi kerak), Google Cloud STT, Azure Speech (TTS'da `uz-UZ` ovozlari bor-yo'qligi tekshiriladi). Fallback sifatida Windows'ning ichki TTS'i ishlatiladi; unda o'zbekcha ovoz bo'lmasligi mumkin.

## 8. Ma'lumotlar

SQLite fayli `%APPDATA%\MARIUS\marius.db` da saqlanadi. Joylashuv Settings'da ko'rsatiladi.

Jadvallar: `migrations`, `app_settings`, `provider_settings` (`secret_ref`), `secrets` (`safeStorage` bilan shifrlangan blob), `conversations`, `messages`, `memory_items`, `reminders`, `action_audit`, `permission_grants`, `allowed_folders`. Har bir jadvalda `id`, `created_at` va kerak bo'lsa `updated_at` bor. Migratsiyalar raqamlangan SQL fayllar ko'rinishida, tranzaksiya ichida bajariladi. DB WAL rejimida ishlaydi, shunda crash bo'lganda ma'lumot buzilmaydi.

Crash'dan keyin: holati `running` bo'lib qolgan audit yozuvlari ilova ishga tushganda `unknown` ga o'tkaziladi.

## 9. Logging va maxfiylik

- `pino` uslubidagi strukturali log `%APPDATA%\MARIUS\logs` ga yoziladi, rotatsiya bilan.
- Redaction filtri: `apiKey`, `token`, `password`, audio, base64 rasm va to'liq transkript logga tushmaydi.
- Telemetriya va analytics yo'q.

## 10. Reminders va notifications

Main process'dagi scheduler eng yaqin `dueDateTime` uchun bitta `setTimeout` qo'yadi (polling yo'q) va tizim uyqudan uyg'onganda (`powerMonitor.resume`) qayta hisoblaydi. Bildirishnoma Electron `Notification` (Windows toast) orqali chiqadi; buning uchun NSIS installer AppUserModelID'ni to'g'ri o'rnatishi kerak. Cheklov: eslatma faqat MARIUS ishlab turganda (tray'da bo'lsa ham) chiqadi.

## 11. Local-first ma'lumotlar va Obsidian integratsiyasi (taklif, v2.1 qo'shimchasi)

> **Holat:** faqat arxitektura. Prompt v2.1 talabiga ko'ra bu modullar foydalanuvchi tasdig'idan keyin amalga oshiriladi.

### 11.1 Asosiy tamoyil
- **SQLite** — MARIUS'ning operatsion ma'lumotlari: tezkor, strukturali va faqat ilovaga tegishli.
- **Obsidian Vault** — foydalanuvchining o'zi o'qiydigan va tahrirlaydigan Markdown bilimlar ombori. **Ixtiyoriy**: Obsidian o'rnatilmagan bo'lsa ham MARIUS to'liq ishlaydi.
- Hech qanday ma'lumot avtomatik cloud'ga yuborilmaydi. Obsidian Sync, OneDrive va boshqa sync xizmatlarini MARIUS o'zi sozlamaydi.

### 11.2 Audit: hozirgi holat (PHASE 1)
| Savol | Javob |
|---|---|
| DB qayerda? | `app.getPath('userData')/marius.db`. Windows'da: `%APPDATA%\MARIUS\marius.db`. Yo'l hardcode qilinmagan, OS API orqali olinadi. Sozlamalar sahifasida ko'rsatiladi |
| Local user-data API to'g'ri ishlatilganmi? | Ha. ⚠️ Eslatma: Electron'ning `userData` papkasi Windows'da **Roaming** profilda. Domen tarmog'ida Roaming profil server bilan sinxronlanishi mumkin. Taklif: PHASE 2 da DB'ni `%LOCALAPPDATA%\MARIUS` ga ko'chirish, eski joydan xavfsiz migratsiya bilan. **Foydalanuvchi qarori kerak** |
| Ma'lumot cloud'ga yuboriladimi? | Yo'q. Hozir hech qanday tarmoq so'rovi yo'q (CSP `connect-src 'self'`) |
| Filesystem permission modeli bormi? | Hali yo'q. PHASE 5 (`allowed_folders` + path guard) bilan umumiy bo'ladi |
| SQLite backup/migratsiya bormi? | Migratsiya bor (tranzaksiyali, testlangan). Backup hali yo'q, `backup-restore-service` sifatida rejalashtirilgan |

### 11.3 Yangi modullar
| Modul | Joylashuv (reja) | Vazifasi |
|---|---|---|
| `local-data-manager` | `src/main/services/local-data` | Barcha lokal yo'llarni bir joyda hisoblaydi, "Ma'lumotlar qayerda?" sahifasi uchun ma'lumot beradi, tarix va xotirani tozalash siyosatini bajaradi |
| `backup-restore-service` | `src/main/services/backup` | SQLite `VACUUM INTO` orqali zaxira nusxa; restore oldidan ogohlantirish va avtomatik "restore oldi" nusxasi |
| `obsidian-vault-adapter` | `src/modules/obsidian/vault-adapter` | Vault papkasini tanlash va tekshirish, Obsidian o'rnatilganligini aniqlash (ixtiyoriy), path guard (ildizdan chiqmaslik, symlink va junction tekshiruvi) |
| `markdown-note-service` | `src/modules/obsidian/notes` | `.md` fayllarni o'qish; yangi note yaratish va oxiriga qo'shish **faqat preview + tasdiq bilan**. Ustidan yozish va o'chirish MVP'da yo'q |
| `vault-indexer` | `src/modules/obsidian/indexer` (worker thread) | Fayl nomi va matni bo'yicha indeks (SQLite FTS5), `mtime` orqali yangilanadi, bekor qilish mumkin, faqat `.md` fayllar |

Har bir Vault amali Tool registry (§6) orqali ishlaydi:

| Tool | Daraja | Tasdiq | Qo'shimcha shart |
|---|---|---|---|
| `vault.search`, `vault.readNote` | 1 | yo'q | Integratsiya yoqilgan va "Read" ruxsati ON |
| `vault.createNote` | 2 | `always` + preview | "Create new notes" ON (default OFF); fayl mavjud bo'lsa rad etiladi |
| `vault.appendToNote` | 3 | `always` + diff preview | "Append" ON (default OFF) |
| overwrite / delete | 4 | — | MVP'da mavjud emas |

### 11.4 Data-flow diagrammasi

```
                    ┌────────────────────── Foydalanuvchi kompyuteri (lokal) ──────────────────────┐
                    │                                                                              │
 Foydalanuvchi ───► │  UI (renderer) ──IPC──► Main process                                         │
   (matn/ovoz)      │                          │                                                   │
                    │                          ├──► SQLite  %APPDATA%\MARIUS\marius.db             │
                    │                          │     sozlamalar, suhbatlar, eslatmalar, ruxsatlar, │
                    │                          │     audit, xotira metadata, vault sozlamasi, indeks│
                    │                          │                                                   │
                    │                          ├──► Log fayllar (secret'larsiz)                    │
                    │                          │                                                   │
                    │                          └──► Obsidian Vault (foydalanuvchi tanlagan papka)  │
                    │                                faqat ruxsat berilgan amallar, .md fayllar     │
                    └──────────────────────────┬───────────────────────────────────────────────────┘
                                               │  faqat joriy so'rov uchun minimal kontekst
                                               │  (cloud provayder bo'lsa, UI'da ogohlantirish)
                                               ▼
                         ┌───────────────────────────────┬──────────────────────────────┐
                         │ Ollama (lokal, kompyuter ichida)│ Google Gemini (cloud, internet)│
                         └───────────────────────────────┴──────────────────────────────┘
```

Qoidalar: SQLite yoki Vault hech qachon butunlay AI'ga yuborilmaydi. RAG natijasidan faqat kerakli kichik parcha olinadi va so'rov qaysi provayderga ketayotgani (lokal yoki cloud) UI'da ko'rsatiladi.

### 11.5 Har bir ma'lumot turi: qayerda, kim kira oladi, qanday o'chiriladi
| Ma'lumot | Saqlash joyi | Lokal/Cloud | Kim kira oladi | Backup | Qanday o'chiriladi |
|---|---|---|---|---|---|
| Sozlamalar | SQLite `app_settings` | Lokal | MARIUS (main process), Windows foydalanuvchisi | MARIUS backup | Sozlamalar → Tiklash / DB'ni o'chirish |
| API kalitlar | SQLite, `safeStorage` (DPAPI) bilan shifrlangan | Lokal | Faqat shu Windows foydalanuvchisi (DPAPI) | Backup'ga **kirmaydi** (DPAPI boshqa kompyuterda ochilmaydi) | Sozlamalar → AI → Kalitni o'chirish |
| Suhbatlar | SQLite `conversations`, `messages` | Lokal. Cloud AI ishlatilsa, joriy so'rov matni provayderga yuboriladi | MARIUS | MARIUS backup | Suhbat → O'chirish / Tarixni tozalash |
| Eslatmalar | SQLite `reminders` | Lokal | MARIUS | MARIUS backup | Vazifalar → O'chirish |
| Xotira | SQLite `memory_items` | Lokal | MARIUS | MARIUS backup | Xotira → O'chirish / Eksport |
| Audit (amallar tarixi) | SQLite `action_audit` | Lokal | MARIUS | MARIUS backup | Tarix → Tozalash (siyosat bilan) |
| Loglar | `%APPDATA%\MARIUS\logs` | Lokal | Windows foydalanuvchisi | Yo'q (rotatsiya) | Papkani o'chirish |
| Vault sozlamasi va indeks | SQLite | Lokal | MARIUS | MARIUS backup (indeks qayta quriladi) | Disconnect Vault / Indeksni tozalash |
| Obsidian notes | Foydalanuvchi tanlagan Vault papkasi | Lokal (foydalanuvchi o'zi sync qilmasa) | Foydalanuvchi, Obsidian, ruxsat bilan MARIUS | Foydalanuvchi o'zi (oddiy papka). **MARIUS backup'iga kirmaydi** | Foydalanuvchi o'zi (MARIUS o'chirmaydi) |
| Mikrofon audio | Faqat xotirada (RAM), real vaqtda | Lokal | — | Saqlanmaydi | Saqlanmaydi |
