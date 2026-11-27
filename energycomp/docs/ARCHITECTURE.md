# EnergyComp — arxitektura

## Umumiy ko‘rinish

```
Brauzer (React, client komponentlar)
   │  fetch /api/*  (JSON: { ok, data } | { ok:false, error:{code,message,details} })
   ▼
Next.js App Router
   ├─ proxy.ts ............ /app/* — cookie yo‘q bo‘lsa /login (optimistik)
   ├─ app/app/* (server) .. requirePageContext() → servislar → client view’ga props
   └─ app/api/* ........... route() o‘rami: CSRF (Origin) + yagona xato formati
          │ requireOrgContext(permission)   ← sessiya + a’zolik + rol, har so‘rovda
          ▼
   server/services/*  ── server/repositories/* ── Prisma 7 (adapter-pg) ── PostgreSQL
          │
          ├─ providers/sensor   DemoDataProvider (pull) · HTTP ingest (push) · MQTT/Modbus (rejada)
          ├─ inspector/rules    5 ta sof qoida → Detection[]
          ├─ providers/ai       rule-based (fallback) · Anthropic (ixtiyoriy) → zod bilan tekshirish
          └─ providers/control  simulation adapter (real adapter yo‘q)
```

## Asosiy qarorlar

| Qaror | Sabab |
| --- | --- |
| Mavjud MARIUS loyihasi o‘chirilmadi; EnergyComp `energycomp/` papkasida alohida | Repozitoriyda boshqa, tugallangan loyiha bor. Root ESLint/Prettier/CI `energycomp/**` ni e’tiborsiz qoldiradi; EnergyComp’ning o‘z CI’si bor. |
| O‘z sessiya autentifikatsiyasi (NextAuth emas) | Email+parol yetarli; DB sessiya (id = SHA-256(token)), httpOnly + SameSite=Lax cookie, “Meni eslab qolish”da 30 kun, aks holda 12 soat va brauzer sessiyasi cookie’si. Bekor qilish oson. |
| Faol tashkilot sessiyada, lekin har so‘rovda a’zolik qayta tekshiriladi | Sessiyadagi id ga ko‘r-ko‘rona ishonilmaydi; a’zolikdan chiqarilgan foydalanuvchi darhol kirishni yo‘qotadi. |
| Har bir tenant jadvalida `organizationId`; servislar `findFirst({ id, organizationId })` | Boshqa tashkilot resursi doim 404 qaytaradi (mavjudligini oshkor qilmaydi). Integratsion testlar bilan tekshirilgan. |
| Ruxsatlar matritsasi `lib/permissions.ts` — server ham, UI ham shundan foydalanadi | UI faqat tugmani yashiradi; asosiy tekshiruv `requireOrgContext(permission)` da. |
| CSRF: o‘zgartiruvchi so‘rovlarda `Origin` host bilan mos bo‘lishi shart | Cookie asosidagi sessiya uchun. `/api/ingest` cookie ishlatmaydi (Bearer token). |
| Telemetriya: `powerKw` (o‘rtacha quvvat) + `energyKwh` (interval energiyasi) + `intervalSeconds` + `source` | kW va kWh aralashmaydi; energiya yig‘indisi to‘g‘ridan-to‘g‘ri `SUM(energyKwh)`. O‘rtacha quvvat = energiya ÷ soat. Maks. quvvat = bir lahzadagi yig‘indining maksimumi. |
| Vaqt: bazada `timestamptz`, agregatsiya `date_trunc(... AT TIME ZONE org.timezone)` | “Bugun”, kun/hafta/oy chegaralari tashkilot vaqt zonasida. |
| Xarajat — har bir bucket o‘sha vaqtda amal qilgan tarif bilan | Tarif tarixi (`EnergyTariff.validFrom`) qo‘llab-quvvatlanadi. Pul — `Decimal(14,4)`. |
| Demo ma’lumot “lazy” generatsiya: so‘rov kelganda oxirgi o‘lchovdan hozirgacha to‘ldiriladi (`ensureFresh`, 20 s throttle) | Fon jarayoni (worker) kerak emas. Deterministik (bir xil vaqt → bir xil qiymat), unique (equipmentId, timestamp) + skipDuplicates — dublikat yo‘q. So‘nggi 6 soat daqiqalik, eskisi 15 daqiqalik. |
| AI Inspector ham `ensureFresh` ichida ishlaydi | Alertlar sahifa ochilganda yangilanadi; ochiq alert bo‘lsa dublikat yaratilmaydi; hal qilingan/rad etilgan alert 60 daqiqa qayta yaratilmaydi; holat tugasa `conditionActive=false`. |
| AI javobidagi dalillar (evidence) doim bazadan | LLM faqat matn yozadi (facts/assumptions/recommendations), javob Zod sxemasi bilan tekshiriladi; xato yoki rad etishda rule-based fallback. Raqamlar to‘qilmaydi. |
| Smart Control: so‘rov → boshqa Owner/Manager tasdig‘i → adapter | O‘z so‘rovini tasdiqlash taqiqlangan. Faqat `SIMULATION` rejimi va faqat DEMO uskunalar. Hammasi `AuditLog`ga. |
| Tarif limitlari `Plan` jadvalida, tekshiruv transaction ichida | Narxlar kodda qotirilmagan (platform admin sozlaydi). |
| 3D xarita (demo) — three.js + @react-three/fiber, `next/dynamic` (ssr:false) bilan faqat kerak bo‘lganda yuklanadi | 2D bilan bir xil ma’lumot (20 px = 1 birlik); og‘ir kutubxona boshqa sahifalar bundle’iga tushmaydi. Pro (`map3d`) tarifida ochiladi. |
| Grafiklar — bitta y-o‘q | Ikki o‘qli grafik ishlatilmaydi: kWh ustunlar, kW — tooltip/jadvalda yoki alohida grafik. Har grafikda “Jadval ko‘rinishi”. Palitra CVD validatordan o‘tgan. |
| Raqam formatlash qo‘lda (Intl emas) | `uz-Latn` lokal ma’lumotlari Node va brauzerda farq qilib, gidratatsiya xatosiga olib kelardi. |

## Ma’lumotlar modeli (Prisma)

`User` · `Session` · `PasswordResetToken` · `Organization` · `OrganizationMember` (rol + bildirishnoma sozlamalari) ·
`Factory` · `MapLayout` (o‘lcham + zonalar JSON) · `EquipmentCategory` · `Equipment` (nominal/baseline/chegaralar,
xarita koordinatalari, manba, holat snapshot’i) · `EquipmentTelemetry` · `ProductionSignal` · `Alert` · `AlertEvent` ·
`AuditLog` · `EnergyTariff` · `Plan` · `Subscription` · `Notification` · `Integration` (ingest token hash) ·
`AIAnalysis` (kirish, chiqish, provider, status, baho) · `ControlRequest`.

Kaskad: tashkilot o‘chirilsa — barcha tenant ma’lumotlari; uskuna o‘chirilsa — telemetriya, signallar, alertlar.
Indekslar: `(organizationId, timestamp)`, `(equipmentId, timestamp)` unique, `(organizationId, status)` va h.k.

## Uskuna holati

`OFFLINE` — 5 daqiqadan ortiq o‘lchov yo‘q → `WARNING` — faol warning/critical alert (NO_DATA’dan tashqari) →
`STOPPED` — quvvat < to‘xtash chegarasi (standart 3% nominal) → `STANDBY` — < kutish chegarasi (20%) → `RUNNING`.
Xaritada holat rang **va** belgi (✓, ‖, ■, !, ✕) bilan, ro‘yxatda matn bilan ko‘rsatiladi.

## AI Inspector qoidalari

| Qoida | Shart | Daraja |
| --- | --- | --- |
| NO_PRODUCTION_SIGNAL | 5 daqiqa quvvat ≥ kutish chegarasi; signal manbasi bor; signal kelmagan (ishonch: o‘rta) yoki faqat “ishlab chiqarmayapti” (yuqori). Manba yo‘q bo‘lsa — xulosa chiqarilmaydi | warning |
| ABOVE_BASELINE | 30 daqiqa o‘rtacha ≥ 1.2× baseline (1.5× — critical). Baseline belgilanmagan bo‘lsa — 7 kunlik tarixiy (ishonch: o‘rta) | warning/critical |
| NO_DATA | 10 daqiqadan ortiq o‘lchov yo‘q (60+ — critical). Bo‘lsa, boshqa qoidalar tekshirilmaydi | warning/critical |
| SUDDEN_CHANGE | 10 daqiqa o‘rtachasi ≥ 1.8× oldingi 60 daqiqa (va ≥ 15% nominal farq) | warning |
| LONG_STANDBY | 60 daqiqa davomida kutish oralig‘ida | info |

Tavsiyalar hech qachon avtomatik harakatni nazarda tutmaydi: “Xavfsiz bo‘lsa, uskunani to‘xtatishni ko‘rib chiqing.
AI tavsiyasi operator qarorini almashtirmaydi.”

## Xavfsizlik

- Parollar bcrypt (12 raund); login’da mavjud bo‘lmagan email uchun ham bir xil vaqt (dummy hash).
- Rate limit: login (IP 30/15 daq, email 10/15 daq), ro‘yxatdan o‘tish, parol tiklash, AI, inspector, ingest, kontakt.
- Parol almashtirilganda boshqa sessiyalar, tiklanganda barcha sessiyalar yopiladi.
- Ingest tokenlari va reset tokenlari faqat SHA-256 hash ko‘rinishida saqlanadi.
- `server-only` — servislar va kalitlar client bundle’ga tushmaydi (build’da tekshirilgan).
- Xavfsizlik sarlavhalari: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- CSV eksportda formula injection’dan himoya (`=`, `+`, `-`, `@` bilan boshlanadigan qiymatlar).
- Kontakt formasi xabarlari `AuditLog`ga yoziladi (email yo‘q).

## Testlar

- **Unit (41):** kW/kWh, tarif tarixi, tejash formulasi, vaqt zonasi, formatlash, CSV, holat, ruxsatlar, 5 qoida,
  demo provider (determinizm, intervallar, ssenariylar), AI fallback va sxema.
- **Integratsion (17, haqiqiy PostgreSQL):** register/login/logout, unique email, CSRF, tashkilot izolyatsiyasi
  (GET/PATCH/DELETE/position/boshqa zavod), CRUD va koordinatalar, rollar (Viewer/Engineer), Free limitlari,
  ingest + token, 5 daqiqalik alert va dedupe, alert holat o‘tishlari va tarix, AI tahlil va kunlik limit,
  demo sinxronizatsiya dublikatsiz, monitoring yig‘indilari = bazadagi yig‘indi, CSV, Smart Control oqimi.
- **E2E (Playwright, desktop + Pixel 7):** landing, auth redirect, ro‘yxatdan o‘tish → uskuna → xarita, demo login,
  mobil gorizontal skroll yo‘qligi.
