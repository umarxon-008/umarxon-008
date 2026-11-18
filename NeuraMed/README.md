# NeuraMed — Yagona tibbiy platforma

> ⚠️ **NeuraMed tashxis qoʻymaydi, dori buyurmaydi va dozani oʻzgartirmaydi.** Shoshilinch holatda — **103** yoki **112**.

NeuraMed — **bemor va shifokor** uchun yagona tibbiy platforma. Roʻyxatdan oʻtishda rol tanlanadi: **Bemor** yoki **Shifokor**; har birining oʻz dashboardi bor.

## 👥 Rollar

| Rol | Bosh sahifa | Nima qila oladi |
|-----|-------------|-----------------|
| Bemor | `/dashboard` | Tibbiy karta (QR), chekap natijasi va koʻrsatkichlarni **koʻradi** (kiritmaydi), dorilar, tahlillar, PHARMA TRACE, MEDCONNECT, 🔔 bildirishnomalar, SOS |
| Shifokor | `/doctor` | Bugungi/yaqin qabullar, "Bemorlarim", bemor sahifasi (karta, dorilar, tahlillar, qabulga tayyorlanish), **chekap oʻtkazish va xulosa**, **koʻrsatkich kiritish**, bemor bilan chat, ish jadvali |

- Shifokor faqat **oʻziga yozilgan** va ruxsatni bekor qilmagan bemorni koʻradi (`assertPatientAccess`). Bemor ruxsatni MEDCONNECT → "Qabullarim"da bekor qiladi.
- Rol JWT ichida; `middleware.ts` bemor sahifalarini shifokorga, shifokor sahifalarini bemorga yopadi; API'lar `requirePatient()` / `requireDoctor()` bilan tekshiradi.
- Roʻyxatdan oʻtgan shifokor MEDCONNECT katalogida chiqadi. Demo: litsenziya **tekshirilmaydi** ("tasdiqlanmagan" belgisi); real versiyada SSV reestri orqali.

## 🧩 Boʻlimlar

| Boʻlim | Sahifa | Nima qiladi | Holat |
|-------|--------|-------------|-------|
| Salomatligim | `/medcard`, `/checkup` | QR tibbiy karta (ochiq havola `/c/<token>`), chekap: shifokor oʻtkazgan 11 savollik soʻrovnoma (0–100 ball, xulosa) + shifokor kiritgan koʻrsatkichlar (puls, qand, vazn, harorat, SpO₂, uyqu) | Ishlaydi; tashxis emas |
| Dorilar | `/medications` | Mening dorilarim (eslatmalar), dori qidirish, dorilar mosligi — bitta sahifada | Ishlaydi |
| Tahlillar | `/lab-reports` | Laboratoriya tahlillari va rentgen/tasviriy hisobotlar — bitta sahifada | Ishlaydi |
| PHARMA TRACE | `/trace` | №17: haqiqiylik, sertifikat, laboratoriya, ishonch indeksi, mahalliy muqobil | Demo maʼlumot |
| MEDCONNECT | `/connect` | Shifokor topish, qabulga yozilish, **qabulga tayyorlanish**, chat — bitta sahifada | Namunaviy katalog + roʻyxatdan oʻtgan shifokorlar |
| Shifokor paneli | `/doctor`, `/doctor/patients/[id]` | Yuqoridagi "Shifokor" roli | Ishlaydi |
| Umumiy | header, footer | Til, mavzu, 🔔 bildirishnomalar (dori vaqti, qabul, chekap, xabar, PHARMA TRACE), profil; SOS tugmasi (103 va joylashuvni yuborish) | Ishlaydi |

Olib tashlangan: qon bosimi, MEDSTOCK AI, alohida SOS sahifasi. Eski havolalar (`/vitals`, `/interactions`, `/reminders`, `/imaging-reports`, `/doctor-visit`, `/sos`, `/stock`) yangi joyiga yoʻnaltiriladi.

Interfeys sodda: katta yozuv, bitta asosiy rang, ortiqcha izoh va DEMO belgilarisiz (video va taqdimot uchun). Katalogdagi shifokorlar, klinikalar va dori partiyalari toʻqima; real tizimlarga ulanmagan.

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

Demo hisoblar (kirishda avtomatik yaratiladi, parol `Test12345!`):

- Bemor: `test@neuramed.uz`
- Shifokor: `doctor@neuramed.uz` (Dilnoza Rahimova, namuna) — bemor bilan namunaviy qabul orqali bogʻlangan

### Muhit oʻzgaruvchilari (`.env.local`)

| Oʻzgaruvchi | Kerakmi | Izoh |
|-------------|---------|------|
| `OPENAI_API_KEY` | Ixtiyoriy | `sk-...` boʻlsa tahlil, dori va PHARMA TRACE tushuntirishlari AI orqali; boʻlmasa shablon |
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
├── app/(main)/            # barcha sahifalar (dashboard, doctor, checkup, medications, lab-reports, trace, connect ...)
├── app/api/               # backend: auth, medications, reminders, lab/imaging, trace, connect, doctor
├── components/layout/     # logotip, yon menyu (kompyuter), pastki menyu (telefon)
├── components/modules/    # modullar uchun umumiy UI (DEMO belgisi, modal, KPI, xavfsiz markdown)
├── lib/safety.ts          # xabar xavfsizligi: shoshilinch belgilar → 103
├── lib/modules/           # PHARMA TRACE, MEDCONNECT, shifokorlar, chekap, bildirishnomalar mantigʻi
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
| GET | `/api/trace?q=...` | PHARMA TRACE: qidiruv va statistika |
| GET | `/api/trace/[id]` | Mahsulot va taʼminot zanjiri |
| POST | `/api/trace/reports` | Shubhali holat haqida xabar (demo) |
| GET | `/api/connect` | MEDCONNECT: shifokorlar va muassasalar |
| GET | `/api/connect/slots?doctorId=` | Boʻsh vaqtlar |
| GET/POST | `/api/connect/appointments` | Qabullar / yozilish |
| PATCH | `/api/connect/appointments/[id]` | Qabulni bekor qilish / shifokorga ruxsat |
| GET/POST | `/api/connect/messages` | Shifokor bilan chat (hisobi bor shifokor oʻzi javob beradi) |
| GET | `/api/checkup`, `/api/vitals` | Bemor: chekap va koʻrsatkichlar (faqat oʻqish) |
| GET | `/api/doctor/patients` | Shifokor: bemorlar va yaqin qabullar |
| GET | `/api/doctor/patients/[id]` | Shifokor: bemor sahifasi (ruxsat bilan) |
| GET/POST | `/api/doctor/patients/[id]/checkup` | Shifokor: chekap oʻtkazish |
| GET/POST/DELETE | `/api/doctor/patients/[id]/vitals` | Shifokor: koʻrsatkich kiritish |
| GET/POST | `/api/doctor/messages` | Shifokor: bemor bilan chat |
| GET/PATCH | `/api/doctor/schedule` | Shifokor: ish jadvali |
| GET/POST | `/api/notifications/feed` | 🔔 bildirishnomalar / hammasini oʻqildi |

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

## 🌍 Tillar: oʻzbek, qozoq, qirgʻiz, tojik, rus, ingliz

Tilni **Sozlamalar → Til** boʻlimida tanlang — sahifa darhol shu tilga oʻtadi (tanlov cookie'da saqlanadi).

- Markaziy Osiyo uchun: oʻzbek, qozoq (`kk`), qirgʻiz (`ky`), tojik (`tg`), shuningdek rus va ingliz.
- Tarjima kaliti — oʻzbekcha matnning oʻzi: koddagi `t("Saqlash")` boshqa tillarda `src/i18n/messages/{ru,en,kk,ky,tg}.ts` dan olinadi; tarjima topilmasa oʻzbekcha qoladi.
- Qozoq, qirgʻiz va tojik tarjimalarini ona tili egasi tekshirib chiqishi tavsiya etiladi.
- Server komponentlarida `const t = await getT()` (`@/i18n/server`), brauzer komponentlarida `const t = useT()` (`@/i18n/client`).
- Yangi matn qoʻshsangiz, barcha lugʻatlarga tarjimasini yozing — `npm run test:unit` tarjimasi yoʻq matnlarni koʻrsatadi.

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
npm run test:unit   # modullar mantigʻi, xavfsizlik tekshiruvi, tarjimalar toʻliqligi
npx playwright install chromium   # bir marta: E2E uchun brauzer
npm run test:e2e    # brauzerda: rollar, chekap (tashxis, izoh), qabul, chat, SOS, TRACE qidiruvi, telefon oʻlchami, tillar
npm test            # ikkalasi
```

E2E testlar dev serverni oʻzi ishga tushiradi (port 3100) va lokal bazaga demo yozuvlar qoʻshadi.

Test hisoblari: `test@neuramed.uz` (bemor) va `doctor@neuramed.uz` (shifokor), parol `Test12345!`

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
- **MEDCONNECT** — real klinika jadvali, shifokor litsenziyasini SSV reestri orqali tekshirish
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
