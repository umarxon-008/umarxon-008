# NeuraMed — Shaxsiy Tibbiy Yordamchi

> ⚠️ **NeuraMed tashxis qo'ymaydi, dori buyurmaydi. Faqat rasmiy manbalardan ma'lumot beradi.**

NeuraMed — dori, laboratoriya tahlili va rentgen hisobotini oddiy o'zbek tilida tushuntiruvchi AI tibbiy yordamchi. Dori eslatmasi, shifokor qabuliga tayyorlov va ko'p tillilik bilan ta'minlangan PWA ilova.

---

## 🚀 Tez boshlash

### 1. Talablar

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### 2. O'rnatish

```bash
# Papkaga o'ting
cd NeuroMed

# Paketlarni o'rnating
npm install

# .env.local faylini sozlang
cp .env.example .env.local
# .env.local faylini oching va qiymatlarni to'ldiring
```

### 3. Environment Variables

`.env.local` faylini to'ldiring:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/neuramed"
AUTH_SECRET="random-32-char-string"
JWT_SECRET="another-random-32-char-string"
OPENAI_API_KEY="sk-..."
ENCRYPTION_KEY="64-hex-chars"  # openssl rand -hex 32
```

### 4. VAPID keys yaratish (Push Notifications)

```bash
npm run vapid:generate
# Natijani .env.local ga qo'shing
```

### 5. Database

```bash
# Schema yaratish
npm run db:push

# Yoki migration bilan
npm run db:migrate

# Test ma'lumot qo'shish
npm run db:seed
```

### 6. Ishga tushirish

```bash
npm run dev
# http://localhost:3000
```

---

## 📁 Loyiha tuzilmasi

```
NeuraMed/
├── prisma/
│   └── schema.prisma          # Ma'lumot modeli
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw-custom.js           # Service Worker
├── scripts/
│   ├── generate-vapid.ts      # VAPID key generator
│   └── seed.ts                # Test ma'lumotlar
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, Register, Onboarding
│   │   ├── (main)/            # Asosiy sahifalar
│   │   │   ├── dashboard/     # Bosh sahifa
│   │   │   ├── medications/   # Dori qidirish va detail
│   │   │   ├── reminders/     # Dori eslatmalari
│   │   │   ├── lab-reports/   # Laboratoriya tahlillari
│   │   │   ├── imaging-reports/ # Rentgen hisobotlari
│   │   │   ├── doctor-visit/  # Shifokor qabuliga tayyorlanish
│   │   │   ├── profile/       # Foydalanuvchi profili
│   │   │   └── settings/      # Sozlamalar
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── ui/                # Button, Card, Input, Badge...
│   │   └── layout/            # BottomNav, TopBar
│   ├── hooks/                 # Custom React hooks
│   ├── i18n/                  # uz, ru, en tarjimalar
│   ├── lib/
│   │   ├── ai/                # OpenAI integration + prompts
│   │   ├── api/               # DailyMed, openFDA, RxNorm
│   │   ├── auth/              # JWT + session
│   │   ├── notifications/     # Web Push
│   │   ├── ocr/               # Tesseract.js
│   │   ├── encryption.ts      # AES-256-GCM
│   │   ├── offline-db.ts      # IndexedDB
│   │   └── prisma.ts          # DB client
│   ├── store/                 # Zustand state
│   └── types/                 # TypeScript types
└── .env.local                 # Environment variables
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

## 🌍 Ko'p tillilik (i18n)

Tarjima fayllari: `src/i18n/locales/`

- `uz/common.json` — O'zbek tili ✅
- `ru/common.json` — Rus tili ✅
- `en/common.json` — Ingliz tili ✅

---

## 🔒 Xavfsizlik

- Barcha tibbiy ma'lumotlar **AES-256-GCM** bilan shifrlangan
- JWT sessiyalar ma'lumotlar bazasida saqlanadi
- AI ga yuborishdan oldin shaxsiy identifikatorlar olib tashlanadi
- GDPR: foydalanuvchi o'z ma'lumotini to'liq o'chirishi mumkin
- Har bir AI javobida disclaimer majburiy

---

## 🧪 Test

```bash
# Test foydalanuvchi:
# Email: test@neuramed.uz
# Parol: Test12345!

# Dori qidirish test:
# - paracetamol
# - ibuprofen
# - amoxicillin
# - metformin
```

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

## 🔮 Kelajakdagi modullar (Integration Points)

Quyidagi modullar uchun integration point qoldirilgan:

- **Rentgen AI tashxis** — `src/lib/ai/imaging-ai.ts` (hozir stub)
- **Shifokor chat** — `src/app/(main)/doctor-chat/` (placeholder)
- **Dorixona integratsiya** — `src/lib/api/pharmacy.ts` (stub)
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
