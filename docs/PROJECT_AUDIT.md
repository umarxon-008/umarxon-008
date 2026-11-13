# MARIUS — PHASE 0: Repository auditi

**Sana:** 2026-11-13
**Branch:** `claude/inspiring-einstein-7f27u5`
**Asosiy manba:** `MARIUS_MASTER_FULL_PROMPT_v2.txt` (v2.0)

---

## 1. Repository holati

| Tekshiruv | Natija |
|---|---|
| Fayllar | Yo'q. Repozitoriyda faqat `.git` papkasi bor |
| Commitlar | Yo'q (`No commits yet`) |
| Remote branchlar | Yo'q: `origin` (`umarxon-008/umarxon-008`) bo'sh |
| `package.json` / konfiguratsiya | Yo'q |
| Mavjud kod / funksiyalar | Yo'q |
| Loyiha qoidalari (`CLAUDE.md`, `CONTRIBUTING`, lint config) | Yo'q |
| Build / lint / test | Bajarib bo'lmaydi: bajariladigan hech narsa yo'q |
| Mavjud testlar | Yo'q |

**Xulosa:** loyiha noldan boshlanadi. Buzilib qolishi mumkin bo'lgan mavjud funksiya ham, migratsiya qilinadigan kod ham yo'q.

## 2. Ishlab chiqish muhiti (audit vaqtidagi holat)

| Vosita | Versiya | Izoh |
|---|---|---|
| OS (dev konteyner) | Linux | **Windows emas.** Ta'siri pastda, R-01 da yozilgan |
| Node.js | 22.23.4 | Electron + Vite uchun yetarli |
| npm | 10.9.9 | |
| pnpm | 10.28.0 | Paket menejeri sifatida tavsiya etiladi |
| Python | 3.13 | Native modul build uchun kerak bo'lishi mumkin |
| Wine | **o'rnatilmagan** | Linux'da `.exe` installer yasash uchun kerak bo'lardi |

npm registry'dagi joriy versiyalar (2026-11-13 holatiga, faqat ma'lumot uchun, **hali hech narsa o'rnatilmagan**):
electron 45.3.2, electron-builder 26.18.0, electron-vite 6.0.0, vite 8.3.8, react 19.3.1, typescript 7.0.2, zod 4.6.7, vitest 5.1.0, better-sqlite3 13.1.1, systeminformation 5.33.21.

> Aniq versiyalar PHASE 1 da o'rnatish paytida, o'zaro moslik tekshirilgandan keyin lockfile'da qotiriladi.

## 3. Talablar va hozirgi holat orasidagi farq (gap analysis)

Repozitoriy bo'sh bo'lgani uchun barcha talablar **bajarilmagan** holatda. Quyida har bir yo'nalish uchun qaysi PHASE'da yopilishi ko'rsatilgan.

| # | Talab bo'limi | Hozirgi holat | Yopiladigan PHASE |
|---|---|---|---|
| 4, 20.1 | Desktop shell, xavfsiz Electron konfiguratsiyasi | Yo'q | 1 |
| 18 | UI, design tokens, navigatsiya | Yo'q | 1 |
| 19 | Onboarding wizard | Yo'q | 1 (skelet), 2–3 (to'liq) |
| 22 | SQLite, migratsiyalar | Yo'q | 1 (asos), 2+ (jadvallar) |
| 6, 7 | AI Brain, provider adapter, chat | Yo'q | 2 |
| 20.5 | Secret saqlash (DPAPI) | Yo'q | 2 |
| 8 | Voice: STT, TTS, state machine | Yo'q | 3 |
| 9, 17, 20.2–20.4, 20.6 | Tool registry, permission policy, confirmation, audit | Yo'q | 4 |
| 10 | Fayl engine | Yo'q | 5 |
| 11 | Brauzer va YouTube | Yo'q | 6 |
| 14, 15 | Xotira va eslatmalar | Yo'q | 7 |
| 12, 16 | Monitoring va Vision | Yo'q | 8 |
| 13 | Boshqariladigan mouse va keyboard amallari | Yo'q | 9 |
| 25 | Installer (.exe), release | Yo'q | 1 (CI build), 10 (to'liq) |
| 24 | Testlar | Yo'q | Har bir PHASE'da |

## 4. Topilgan muammolar va ochiq savollar

1. **Dev muhit Linux, mahsulot Windows uchun.** Windows API (oynalar ro'yxati, Start Menu, DPAPI, toast) bu yerda real sinovdan o'tkazilmaydi. Yechim: GitHub Actions'dagi `windows-latest` runner'da build va test, hamda foydalanuvchining Windows kompyuterida qo'lda tekshirish. Batafsil: RISK_REGISTER, R-01.
2. **AI provider tanlanmagan.** Qaysi provider (Anthropic Claude, OpenAI yoki boshqa) ishlatilishi va API kalit bor-yo'qligi foydalanuvchidan so'raladi.
3. **O'zbek tilidagi STT/TTS sifati noma'lum.** Hech bir servis o'zbek tilini yaxshi qo'llaydi deb oldindan da'vo qilinmaydi. PHASE 3 da real test to'plami bilan o'lchanadi.
4. **Code signing sertifikati yo'q.** Imzosiz `.exe` Windows SmartScreen ogohlantirishini chiqaradi. MVP uchun bu qabul qilinadimi, foydalanuvchi qaror qiladi.
5. **Pullik servislar.** AI, STT/TTS va YouTube Data API kalitlarini foydalanuvchining o'zi kiritadi. Foydalanuvchi tasdig'isiz pullik servisga ulanilmaydi.

## 5. Talablar ichidagi zidliklar

Jiddiy zidlik topilmadi. Aniqlashtirilgan nuqtalar:

- **§11 YouTube "natijalarni haqiqiy manbadan ol" va "brauzer orqali qidiruv".** API kalit bo'lmasa, MARIUS faqat brauzerda qidiruv sahifasini ochadi va natijalarni o'zi ro'yxat qilib ko'rsatmaydi. Sahifani scraping qilish ToS va §11 dagi "himoyalarni chetlab o'tma" talabi bilan xavfli bo'lgani uchun rejaga kiritilmagan.
- **§15 "Vaqt kelganda Windows notification" va ilova yopiq bo'lgan holat.** MVP'da eslatmalar faqat MARIUS ishlab turganida (tray'da bo'lsa ham) chiqadi. Avtomatik startup default holatda o'chiq (§23), shuning uchun cheklov UI va README'da aniq yoziladi.
- **§20.2 LEVEL 2 "Tasdiq siyosati amal turiga qarab".** Har bir tool uchun tasdiq siyosati manifestda aniq belgilanadi (ARCHITECTURE §6).

## 6. Keyingi qadam

PHASE 0 hujjatlari: `ARCHITECTURE.md`, `ROADMAP.md`, `RISK_REGISTER.md`. Foydalanuvchi ularni tasdiqlamaguncha kod yozilmaydi va dependency o'rnatilmaydi.
