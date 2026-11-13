# MARIUS — Ish rejasi (Roadmap)

Har bir PHASE oxirida quyidagilar bajariladi: lint, typecheck, unit/integration testlar, build, hamda o'zgargan fayllar, test natijalari va qolgan muammolar bo'yicha hisobot. Bir PHASE testlari o'tmaguncha keyingisiga o'tilmaydi.

**Muhit eslatmasi:** ishlab chiqish Linux konteynerda olib boriladi. Windows'ga xos sinovlar GitHub Actions'dagi `windows-latest` runner'da va foydalanuvchining kompyuterida qo'lda bajariladi. Har bir PHASE hisobotida qaysi sinov qayerda o'tkazilgani aniq yoziladi.

Baholar taxminiy bo'lib, "ish sessiyasi" birligida berilgan.

---

## PHASE 0 — Audit va arxitektura ✅ (shu hujjatlar)
PROJECT_AUDIT, ARCHITECTURE, ROADMAP, RISK_REGISTER.

## PHASE 1 — App foundation va design system 🟡 (kod tayyor; Windows'da sinov va foydalanuvchi dizayni kutilmoqda)
- npm + electron-vite + React + TS (strict), ESLint, Prettier, Vitest.
- Xavfsiz `BrowserWindow`, CSP, preload `window.marius` API, typed IPC + zod.
- SQLite spike (`better-sqlite3` va `node:sqlite`), migratsiya runner, `app_settings`.
- Design tokens (dark theme), MARIUS logo/ikon (original), sidebar: Dashboard, Assistant, Computer, Memory, Tasks, Monitoring, Settings.
- Dashboard skeleti; loading, empty va error holatlari; reduced-motion.
- Onboarding wizard skeleti ("keyinroq sozlash" bilan).
- GitHub Actions: Windows'da lint, test, build va **test uchun imzosiz `.exe`**.

**Qabul mezonlari:** Windows'da ishga tushadi, navigatsiya ishlaydi, renderer'dan `require` va `process` yo'qligi testda tekshirilgan, CI yashil.

## PHASE 2 — Chat (~2 sessiya)
- `AIProvider` interfeysi va foydalanuvchi tanlagan birinchi adapter.
- Streaming, cancel, timeout, retry; xatoliklar o'zbekcha matnlarga map qilingan.
- `conversations` / `messages`; yangi suhbat; tarixni tozalash.
- Settings → AI provider: key kiritish, almashtirish va o'chirish (`safeStorage`), "Ulanishni tekshirish".
- Provider sozlanmagan holat uchun tushunarli onboarding.

**Qabul mezonlari:** haqiqiy kalit bilan real chat ishlaydi; kalit DB'da shifrlangan (test bilan tasdiqlangan); kalit log, renderer bundle va git'da yo'q.

## PHASE 3 — Voice MVP (~2–3 sessiya)
- Push-to-talk, mikrofon ruxsati va xatolik holatlari.
- STT adapter, transkriptni tahrirlab yuborish; TTS adapter (play/pause/stop, tezlik).
- Voice state machine va unit testlari.
- O'zbekcha test to'plami (≥40 gap: qisqa buyruq, raqam va vaqt, dastur nomlari, aralash so'zlar); WER/aniqlik hisoboti `docs/VOICE_QUALITY.md` da.

**Qabul mezonlari:** gapirish → transkript → yuborish → ovozli javob zanjiri ishlaydi; TTS ishlamasa ham matnli javob chiqadi; sifat haqida o'lchangan raqamlar keltirilgan.

## PHASE 4 — Tool registry va Windows asoslari (~3 sessiya)
- `ToolManifest`, registry, zod validatsiya, `PermissionPolicy`, noma'lum tool'ni rad etish.
- Confirmation card (nima qilinadi, nimaga ta'sir qiladi, xavf darajasi, tasdiq/bekor), bir martalik tasdiq.
- `action_audit` va Settings'dagi audit ko'rinishi.
- Tool'lar: `getSystemInfo`, `getDiskUsage`, `getBatteryStatus`, `listInstalledApps`, `launchApp`, `listVisibleWindows`, `focusWindow`.
- AI tool calling loop + Tool activity card'lar.

**Qabul mezonlari:** unknown tool, noto'g'ri argument va tasdiqsiz amal bo'yicha testlar; har bir amal audit qilinadi; "Kalkulyatorni och" Windows'da ishlaydi.

## PHASE 5 — File manager (~2 sessiya)
- `allowed_folders` UI, path guard (traversal, symlink, junction).
- `searchFiles` (nom, kengaytma, sana), progress va cancel, worker thread'da bajariladi.
- `openFile`, `createFolder`, `copyFile`, `renameFile`, `moveFile` (preview va tasdiq bilan).

**Qabul mezonlari:** ruxsat etilgan ildizdan tashqaridagi path bloklanishi testlangan; bir nechta natija topilsa, foydalanuvchiga tanlash ro'yxati ko'rsatiladi.

## PHASE 6 — Brauzer va YouTube (~1–2 sessiya)
- `openWebSearch` (default brauzerda ochish, faqat https).
- YouTube: API kaliti bo'lsa YouTube Data API orqali real natija kartalari; kalit bo'lmasa brauzerda qidiruv ochiladi va bu UI'da aniq ko'rsatiladi.

**Qabul mezonlari:** soxta natija yo'q; har bir natijada manba va havola bor.

## PHASE 7 — Xotira va eslatmalar (~2–3 sessiya)
- `memory_items`: ko'rish, qidirish, tahrirlash, o'chirish, eksport, yoqish/o'chirish; faqat foydalanuvchi tasdiqlagan yozuvlar saqlanadi.
- Eslatmalar CRUD, o'zbekcha vaqt ifodalari ("ertaga", "kechqurun", "soat yettida") va noaniq vaqtni tasdiqlatish, timezone, scheduler, toast, tray.

**Qabul mezonlari:** vaqt parser testlari (yarim tun, DST, timezone); eslatma restartdan keyin ham saqlanadi.

## PHASE 8 — Monitoring va Vision (~2 sessiya)
- CPU, RAM, disk va batareya kartalari, pauza imkoniyati, oxirgi yangilanish vaqti.
- Ekran tahlili: indikator → rozilik → skrinshot → vision adapter → natija. Sezgir oynalar haqida ogohlantirish beriladi.

**Qabul mezonlari:** ko'rsatkichlar real manbadan olinadi; roziliksiz rasm yuborilmaydi (test bilan tasdiqlangan).

## PHASE 9 — Boshqariladigan desktop amallari (~2 sessiya)
- Faqat allowlist'dagi oddiy amallar; preview, cancel va natijani tekshirish.
- Prompt injection fixture'lari (web, fayl, OCR) va ularga testlar.

## PHASE 10 — Hardening va release (~2 sessiya)
- To'liq regression, `npm audit`, performance va memory leak tekshiruvi.
- NSIS installer: o'rnatish papkasini tanlash, shortcut, uninstall (user data saqlansinmi yoki o'chirilsinmi tanlovi bilan), startup default o'chiq.
- README (prerequisites, dev run, env, test, build, package, troubleshooting), `KNOWN_LIMITATIONS.md`, release checklist.
- Clean install va uninstall testi Windows 10/11'da.

---

## MVP chegarasi
PHASE 1–7 + PHASE 10 dagi installer = MVP (§28). PHASE 8–9 V2 ga o'tkazilishi mumkin; bu foydalanuvchi bilan kelishiladi. Wake word, real-time streaming voice, plugin SDK va auto-update MVP'ga kirmaydi.
