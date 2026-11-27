# EnergyComp

**Energiya sarfini boshqaring. Kelajakni tejang.**

EnergyComp — ishlab chiqarish korxonalari uchun elektr energiyasi sarfini kuzatish, tahlil qilish va isrofni
aniqlash platformasi (MVP). Interfeys tili — o‘zbek (lotin).

> **Holat: MVP 0.1.0.** Barcha asosiy modullar ishlaydi va avtomatik testlardan o‘tgan.
> Real sensor, LLM, email va to‘lov integratsiyalari ulanmagan joylarda bu UI’da **ochiq ko‘rsatiladi**.
> Cheklovlar va keyingi bosqichlar: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Imkoniyatlar

| Modul | Holat |
| --- | --- |
| Ro‘yxatdan o‘tish, kirish, parolni tiklash, sessiyalar | ✅ ishlaydi (email ulanmagan — dev rejimida tiklash havolasi sahifada) |
| Tashkilotlar (multi-tenant), rollar: Owner / Manager / Engineer / Viewer | ✅ serverda tekshiriladi |
| Dashboard (kW, kWh, xarajat, holatlar, top iste’molchilar, AI tavsiyalar) | ✅ |
| Uskunalar CRUD, kategoriyalar, zavodlar | ✅ |
| 2D Factory Map (zoom/pan, drag-and-drop, klaviatura, zonalar, koordinatalar bazada) | ✅ |
| 3D xarita (demo) | ✅ Pro: three.js sahna — aylantirish/yaqinlashtirish, holat chiroqlari, uskunani tanlash. Joylashuvlar 2D’dan, tahrirlash 2D’da |
| Energy Monitoring (davr, soat/kun/hafta/oy, uskuna/zavod filtri, CSV) | ✅ |
| AI Inspector: 5 qoida, alertlar, holatlar, audit, AI tahlil + fallback, baholash | ✅ |
| LLM tahlil (Anthropic) | ⚙️ ixtiyoriy — `ANTHROPIC_API_KEY` bilan, Pro tarifida |
| Analytics (taqqoslash, top, alert dinamikasi, kategoriya, soatlik profil, taxminiy tejash, CSV) | ✅ |
| Smart Control | 🔒 READ-ONLY standart; simulyatsiya rejimi (2 shaxs tasdig‘i, audit). Real boshqaruv yo‘q |
| Tariflar va limitlar (Free/Pro) | ✅ backendda; narxlar belgilanmagan, obuna demo |
| HTTP ingest API (real o‘lchovlar) | ✅ Pro; MQTT/Modbus — rejalashtirilgan |

## Texnologiyalar

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 · three.js + React Three Fiber (3D demo) · PostgreSQL 16 · Prisma 7 (driver adapter `pg`) ·
Zod 4 · React Hook Form · Recharts · Lucide · bcrypt · Vitest · Playwright. Batafsil: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Ishga tushirish (development)

Talablar: **Node.js ≥ 22.12**, **PostgreSQL 16** (yoki 14+).

```bash
cd energycomp
cp .env.example .env            # DATABASE_URL ni moslang
npm install                     # prisma generate avtomatik ishlaydi

# Baza va foydalanuvchi (bir marta, psql orqali):
#   CREATE USER energycomp WITH PASSWORD 'energycomp' CREATEDB;
#   CREATE DATABASE energycomp OWNER energycomp;
#   CREATE DATABASE energycomp_test OWNER energycomp;   -- testlar uchun

npm run db:deploy               # migratsiyalarni qo‘llash (yangi migratsiya yaratish: npm run db:migrate)
npm run db:seed                 # demo tashkilot, 13 uskuna, 30 kunlik demo telemetriya
npm run dev                     # http://localhost:3000
```

Seed takroriy ishga tushirilganda dublikat yaratmaydi.

### Demo kirish ma’lumotlari (faqat development)

| Email | Parol | Rol |
| --- | --- | --- |
| `admin@energycomp.uz` | `Demo12345` | Owner + platforma admin |
| `manager@energycomp.uz` | `Demo12345` | Manager |
| `engineer@energycomp.uz` | `Demo12345` | Engineer |
| `viewer@energycomp.uz` | `Demo12345` | Viewer |
| `other@example.uz` | `Demo12345` | Boshqa tashkilot egasi (izolyatsiyani tekshirish uchun) |

Demo tashkilot Pro (demo obuna) va Smart Control **simulyatsiya** rejimida. Yangi ro‘yxatdan o‘tgan tashkilotlar —
Free va READ-ONLY.

**5 daqiqalik AI ssenariysi:** “CNC frezer stanogi #3” (CNC-03) doimiy energiya sarflaydi, ishlab chiqarish signali
manbasi ulangan, lekin signal kelmaydi → AI Inspector “energiya sarflanmoqda, ishlab chiqarish signali kelmadi”
ogohlantirishini yaratadi. Boshqa ssenariylar: baseline’dan yuqori quvvat (PCH-01), aloqa uzilishi (CNC-04),
uzoq kutish (LZR-01), keskin o‘sish (NAS-01, har 3 soatda), real manbali lekin ma’lumot kelmayotgan uskuna (SVR-01).

## Tekshirish

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint (next/core-web-vitals + typescript)
npm test              # Vitest: unit + integratsion (TEST_DATABASE_URL kerak, aks holda integratsion testlar o‘tkazib yuboriladi)
npm run build         # production build
npx playwright install chromium && npm run test:e2e   # E2E (desktop + mobil); avval `npm run build` va seed
npm run check         # typecheck + lint + test + build
```

Integratsion testlar `TEST_DATABASE_URL` bazasiga migratsiyalarni qo‘llaydi va uning jadvallarini **tozalaydi**.
Xavfsizlik uchun u `DATABASE_URL` bilan bir xil bo‘lsa, testlar to‘xtaydi.
Agar tizimda Playwright’ning boshqa versiyasidagi Chromium bo‘lsa: `PW_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## Production

```bash
npm ci && npm run db:deploy && npm run build && npm start
```

Muhit o‘zgaruvchilari — [`.env.example`](.env.example). `APP_URL` ni haqiqiy manzilga o‘rnating. Production’da
parolni tiklash havolasi sahifada ko‘rsatilmaydi (email xizmati ulanmagan — `docs/ROADMAP.md`).
Rate limit hozircha xotirada (bitta instansiya uchun).

## Loyiha tuzilmasi

```
energycomp/
├─ prisma/                 schema.prisma, migrations/, seed.ts
├─ src/
│  ├─ app/                 (public) landing/features/pricing/about · (auth) login/register/... · app/* · api/*
│  ├─ components/          ui/ (button, card, form, modal, badge...) · layout/ (sidebar, header) · brand/ · public/
│  ├─ features/            dashboard, equipment, factory-map, monitoring, inspector, analytics, charts, ...
│  ├─ lib/                 energy (kW/kWh), time (vaqt zonasi), format, csv, permissions, status, tokens, api-client
│  ├─ schemas/             Zod sxemalar (server va klient uchun umumiy)
│  ├─ server/
│  │  ├─ auth/             sessiya, parol, kontekst (a’zolik + rol)
│  │  ├─ services/         biznes mantiq (har bir funksiya organizationId bilan cheklangan)
│  │  ├─ repositories/     tenant-scoped so‘rovlar, telemetriya agregatsiyasi (SQL)
│  │  ├─ providers/        sensor (demo, http-ingest, mqtt*, modbus*), ai (rule-based, anthropic), control (simulation)
│  │  └─ inspector/        qoidalar dvigateli (sof funksiyalar)
│  └─ proxy.ts             /app/* uchun optimistik auth yo‘naltirish
├─ tests/                  unit/, integration/, e2e/
└─ docs/                   ARCHITECTURE.md, INTEGRATIONS.md, ROADMAP.md
```

## Hujjatlar

- [Arxitektura va qarorlar](docs/ARCHITECTURE.md)
- [Integratsiyalar: sensorlar, AI, boshqaruv](docs/INTEGRATIONS.md)
- [Cheklovlar va keyingi bosqichlar](docs/ROADMAP.md)
