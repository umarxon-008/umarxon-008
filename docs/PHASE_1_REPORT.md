# PHASE 1 hisoboti: App foundation va design system

**Sana:** 2026-11-13
**Holat:** Kod tayyor. Windows'da qo'lda sinov va foydalanuvchi dizayni kutilmoqda.

## Qilingan ishlar
- Electron 45 + React 19 + TypeScript 6 (strict), electron-vite 6 / Vite 8.
- Xavfsiz oyna: `contextIsolation`, `sandbox`, `nodeIntegration: false`, CSP, tashqi navigatsiya va yangi oyna bloklangan, barcha ruxsat so'rovlari (mikrofon va h.k.) hozircha rad etiladi. Bitta nusxa (single instance) rejimi.
- IPC: yagona shartnoma (`src/shared/ipc.ts`), kanallar allowlist'i, kirish va chiqish zod bilan tekshiriladi, jo'natuvchi sahifa tekshiriladi, xatolar o'zbekcha xabarga aylantiriladi.
- SQLite (`node:sqlite`), WAL, tranzaksiyali migratsiyalar, `app_settings`.
- Strukturali JSON log, maxfiy maydonlarni yashirish (redaction), rotatsiya.
- UI: design tokens (qorong'i va yorug' mavzu), sidebar (7 bo'lim), Bosh sahifa, Sozlamalar (mavzu, harakatni kamaytirish, dastur haqida, log papkasi), tanishuv oynasi (5 qadam, "Keyinroq" bilan), loading/error/empty holatlari, ErrorBoundary, kichik oyna uchun ixcham sidebar, klaviatura fokusi.
- Tayyor bo'lmagan bo'limlar ishlayotgandek ko'rsatilmaydi: har birida "N-bosqichda qo'shiladi" yozuvi bor.
- Original vaqtinchalik MARIUS belgisi (`build/icon.svg`, `build/icon.png`).
- `electron-builder` NSIS installer: o'rnatish papkasini tanlash, Start menu va Desktop shortcut, uninstall.
- GitHub Actions (`windows-latest`): typecheck → lint → unit → build → E2E → `.exe` artifact.

## Tekshiruv natijalari (Linux dev konteyner)
| Tekshiruv | Natija |
|---|---|
| `npm run typecheck` | ✅ o'tdi |
| `npm run lint` | ✅ o'tdi |
| `npm test` (unit) | ✅ 24/24 |
| `npm run build` | ✅ o'tdi |
| `npm run test:e2e` (xvfb, haqiqiy Electron) | ✅ 4/4: renderer'da `require`/`process` yo'q; `window.marius` muzlatilgan; noto'g'ri IPC rad etiladi; tanishuv → bosh sahifa → sozlamalar; mavzu restartdan keyin saqlanadi; tashqi sahifaga o'tish bloklanadi |
| Paketlangan ilova (Linux `dir` build) | ✅ ishga tushdi, `marius.db` va log yaratildi, versiya 0.1.0 |
| Vizual tekshiruv (skrinshotlar) | ✅ 3 ta kamchilik topilib tuzatildi (skip-link, tugma kengligi, versiya) |

## Windows'da hali tekshirilmagan
| Tekshiruv | Qayerda |
|---|---|
| CI: Windows'da build, E2E va `.exe` | GitHub Actions: natija pushdan keyin |
| Installer: o'rnatish, shortcut, ochilish, uninstall | Foydalanuvchi kompyuteri (Windows 10/11) |
| SmartScreen xatti-harakati | Foydalanuvchi kompyuteri |

## Qolgan ishlar / ma'lum cheklovlar
- Vizual dizayn vaqtinchalik. Foydalanuvchi dizayni kelganda `tokens.css`, `app.css` va belgi yangilanadi.
- Installer imzolanmagan (R-07).
- Uninstall'da ma'lumotlarni o'chirish tanlovi PHASE 10 da.

## Keyingi qadam
1. Foydalanuvchi Windows'da `.exe` ni sinaydi.
2. Dizayn materiallari asosida UI yangilanadi.
3. PHASE 2: Gemini + Ollama provayderlari bilan haqiqiy chat.
