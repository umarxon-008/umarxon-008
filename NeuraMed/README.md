# NeuraMed — Yagona tibbiy platforma

> ⚠️ **NeuraMed tashxis qoʻymaydi, dori buyurmaydi va dozani oʻzgartirmaydi.** Shoshilinch holatda — **103** yoki **112**.

NeuraMed — ikki loyihaning birlashmasi:

- **NeuraMed** (asos) — shaxsiy tibbiy yordamchi: dori maʼlumoti, eslatmalar, tahlil va rentgen hisobotlarini oddiy oʻzbek tilida tushuntirish, shifokor qabuliga tayyorlanish. PWA.
- **MEDPERFECT** — MEDAI, PHARMA TRACE, MEDCONNECT va MEDSTOCK AI modullari. Endi ular ham NeuraMed ichida, bitta hisob, bitta dizayn va bitta backend (Next.js API + Prisma) ustida ishlaydi.

## 🧩 Modullar

| Modul | Sahifa | Nima qiladi | Holat |
|-------|--------|-------------|-------|
| Shaxsiy yordamchi | `/dashboard`, `/medications`, `/reminders`, `/lab-reports`, `/imaging-reports`, `/doctor-visit` | Dori, eslatma, tahlil, rentgen, qabulga tayyorlanish | Ishlaydi |
| MEDAI | `/assistant`, `/library` | AI yordamchi (suhbatlar tarixi, manbalar, xavf ogohlantirishi) va 26 atamali tibbiy kutubxona | Ishlaydi: OpenAI kaliti boʻlsa AI, boʻlmasa qoidaga asoslangan demo |
| PHARMA TRACE | `/trace` | QR/partiya boʻyicha dori kelib chiqishi, 4 bosqichli taʼminot zanjiri, shubhali holat haqida xabar | Demo maʼlumot |
| MEDCONNECT | `/connect` | Shifokor va muassasalar, boʻsh vaqtlar, qabulga yozilish, shifokor bilan chat | Demo maʼlumot, avtomatik javob |
| MEDSTOCK AI | `/stock` | Dorixona zaxirasi, kam qolgan/muddati yaqin dorilar, chiqim grafigi, buyurtma tavsiyasi | Demo ombor, qoidaga asoslangan tahlil |

Namunaviy maʼlumotlar har doim **DEMO** yoki **(namuna)** belgisi bilan koʻrsatiladi. Shifokorlar, klinikalar, dori partiyalari va ombor toʻqima; real tizimlarga ulanmagan.

---

## 🚀 Lokal kompyuterda ishga tushirish (localhost)

Talab: **Node.js 18+** (20 tavsiya etiladi). PostgreSQL **shart emas** — u boʻlmasa, loyiha avtomatik ravishda `storage/local-dev-db.json` lokal bazasidan foydalanadi.

```bash
cd NeuraMed
npm install          # paketlar + prisma generate
cp .env.example .env.local   # ixtiyoriy: qiymatlarni boʻsh qoldirsangiz ham ishlaydi
npm run dev
```

Brauzerda oching: **http://localhost:3000**

Test hisobi (lokal bazada avtomatik yaratiladi):

- Email: `test@neuramed.uz`
- Parol: `Test12345!`

### Muhit oʻzgaruvchilari (`.env.local`)

| Oʻzgaruvchi | Kerakmi | Izoh |
|-------------|---------|------|
| `OPENAI_API_KEY` | Ixtiyoriy | `sk-...` boʻlsa MEDAI va tushuntirishlar AI orqali; boʻlmasa demo rejim |
| `DATABASE_URL` | Ixtiyoriy | PostgreSQL. Boʻlmasa — lokal JSON baza |
| `JWT_SECRET` | Productionda majburiy | Kamida 32 belgi. Lokal rejimda vaqtinchalik kalit ishlatiladi |
| `ENCRYPTION_KEY` | Productionda majburiy | 64 hex belgi: `openssl rand -hex 32` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Ixtiyoriy | Push bildirishnomalar: `npm run vapid:generate` |

> 🔐 `.env.local` faylini hech qachon gitga qoʻshmang va boshqalarga yubormang — u `.gitignore` da.

### PostgreSQL bilan (ixtiyoriy)

```bash
npm run db:push    # jadvallarni yaratish
npm run db:seed    # test maʼlumot
```

### Production build

```bash
npm run build
npm start          # http://localhost:3000
```

---

## 📁 Asosiy tuzilma

```
src/
├── app/(auth)/            # login, register, onboarding
├── app/(main)/            # barcha sahifalar (dashboard, assistant, library, trace, connect, stock, more, about ...)
├── app/api/               # backend: auth, medications, reminders, lab/imaging, assistant, trace, connect, stock
├── components/layout/     # logotip, yon menyu (kompyuter), pastki menyu (telefon)
├── components/modules/    # modullar uchun umumiy UI (DEMO belgisi, modal, KPI, xavfsiz markdown)
├── lib/medai/             # MEDAI: xavfsizlik qoidalari, demo javoblar, kutubxona (MEDPERFECT'dan)
├── lib/modules/           # PHARMA TRACE, MEDCONNECT, MEDSTOCK biznes-mantigʻi
└── data/                  # namunaviy maʼlumotlar va tibbiy atamalar
prisma/schema.prisma       # User, Reminder, LabReport ... + AssistantThread, Appointment, DoctorMessage, StockItem, StockMovement, TraceReport
public/brand/              # NeuraMed logotipi (tabletkali)
```

---

## 🔌 API Endpoints

| Method | URL | Vazifasi |
|--------|-----|---------|
| GET/POST | `/api/auth?action=login\|register\|logout` | Auth |
| GET | `/api/medications/search?q=...` | Dori qidirish (RxNorm) |
| GET | `/api/medications/[id]?name=...` | Dori detail (DailyMed + AI) |
| GET/POST | `/api/reminders` | Eslatmalar |
| GET/PATCH/DELETE | `/api/reminders/[id]` | Eslatma boshqaruv |
| GET/POST | `/api/lab-reports` | Lab tahlillari |
| GET/DELETE | `/api/lab-reports/[id]` | Lab tahlili detail |
| GET/POST | `/api/imaging-reports` | Rentgen hisobotlari |
| GET/DELETE | `/api/imaging-reports/[id]` | Rentgen detail |
| GET/POST | `/api/doctor-visit` | Shifokor tayyorlov |
| GET/PATCH/DELETE | `/api/profile` | Profil boshqaruv |
| POST | `/api/notifications/subscribe` | Push subscribe |
| POST | `/api/notifications/send` | Push yuborish |
| GET/POST | `/api/assistant` | MEDAI: suhbatlar roʻyxati / savol yuborish |
| GET/DELETE | `/api/assistant/[id]` | MEDAI suhbati |
| GET | `/api/trace?q=...` | PHARMA TRACE: qidiruv va statistika |
| GET | `/api/trace/[id]` | Mahsulot va taʼminot zanjiri |
| POST | `/api/trace/reports` | Shubhali holat haqida xabar (demo) |
| GET | `/api/connect` | MEDCONNECT: shifokorlar va muassasalar |
| GET | `/api/connect/slots?doctorId=` | Boʻsh vaqtlar |
| GET/POST | `/api/connect/appointments` | Qabullar / yozilish |
| PATCH | `/api/connect/appointments/[id]` | Qabulni bekor qilish |
| GET/POST | `/api/connect/messages` | Shifokor bilan demo chat |
| GET | `/api/stock` | MEDSTOCK AI: zaxira va tahlil |
| POST | `/api/stock/movements` | Kirim / chiqim |
| POST | `/api/stock/reset` | Demo omborni tiklash |

---

## 🏗️ Texnik arxitektura

| Qatlam | Texnologiya |
|--------|------------|
| Frontend | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + IndexedDB (offline) |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (jose) + bcryptjs |
| AI | OpenAI GPT-4o-mini |
| Drug APIs | DailyMed v2 + openFDA + RxNorm |
| OCR | Tesseract.js |
| Notifications | Web Push + VAPID |
| PWA | next-pwa |
| Encryption | AES-256-GCM |

---

## 🌍 Tillar: oʻzbek, rus, ingliz

Tilni **Sozlamalar → Til** boʻlimida tanlang — sahifa darhol shu tilga oʻtadi (tanlov cookie'da saqlanadi).

- Tarjima kaliti — oʻzbekcha matnning oʻzi: koddagi `t("Saqlash")` rus tilida `src/i18n/messages/ru.ts`, ingliz tilida `en.ts` dan olinadi; tarjima topilmasa oʻzbekcha qoladi.
- Server komponentlarida `const t = await getT()` (`@/i18n/server`), brauzer komponentlarida `const t = useT()` (`@/i18n/client`).
- Yangi matn qoʻshsangiz, `ru.ts` va `en.ts` ga tarjimasini yozing — `npm run test:unit` tarjimasi yoʻq matnlarni koʻrsatadi.
- MEDAI kutubxonasi maqolalari va demo javoblar hozircha faqat oʻzbekcha; OpenAI kaliti boʻlsa, AI tanlangan tilda javob beradi.

---

## 🔒 Xavfsizlik

- Barcha tibbiy ma'lumotlar **AES-256-GCM** bilan shifrlangan
- JWT sessiyalar ma'lumotlar bazasida saqlanadi
- AI ga yuborishdan oldin shaxsiy identifikatorlar olib tashlanadi
- GDPR: foydalanuvchi o'z ma'lumotini to'liq o'chirishi mumkin
- Har bir AI javobida disclaimer majburiy

---

## 🧪 Testlar

```bash
npm run test:unit   # modullar mantigʻi, MEDAI xavfsizligi, tarjimalar toʻliqligi
npx playwright install chromium   # bir marta: E2E uchun brauzer
npm run test:e2e    # brauzerda: barcha sahifalar, qabul, chat, ombor, TRACE, til almashtirish
npm test            # ikkalasi
```

E2E testlar dev serverni oʻzi ishga tushiradi (port 3100) va lokal bazaga demo yozuvlar qoʻshadi.

Test hisobi: `test@neuramed.uz` / `Test12345!`

---

## 🚢 Deployment

### Vercel

```bash
# Vercel CLI
npm i -g vercel
vercel

# Environment variables ni Vercel dashboard da qo'shing
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔮 Keyingi bosqich (real versiya)

- **PHARMA TRACE** — davlat reestri / ishlab chiqaruvchi API bilan integratsiya
- **MEDCONNECT** — real klinika jadvali, shifokor kabineti, bildirishnomalar
- **MEDSTOCK AI** — dorixona hisob tizimi bilan sinxronlash, sotuv tarixiga asoslangan prognoz
- **MEDAI** — tasdiqlangan tibbiy hujjatlar bazasi (RAG) va ekspert tekshiruvi
- **Supabase Storage** — `STORAGE_PROVIDER=supabase` env bilan yoqiladi
- **Cloudflare R2** — `STORAGE_PROVIDER=r2` env bilan yoqiladi

---

## ⚠️ Muhim eslatma

**NeuraMed tibbiy maslahat bermaydi.** Bu ilova:
- ✅ Rasmiy manbalardan ma'lumot tushuntiradi
- ✅ Dori eslatmasi qo'yadi
- ✅ Lab va rentgen atamalarini izohlaydi
- ✅ Shifokorga savollar tayyorlaydi
- ❌ Tashxis qo'ymaydi
- ❌ Dori buyurmaydi
- ❌ Doza o'zgartirmaydi
- ❌ Tibbiy maslahat bermaydi

---

*NeuraMed — O'zbek tilida, o'zbek foydalanuvchilari uchun.*
