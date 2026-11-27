# Integratsiyalar

Joriy holat (UI: **Sozlamalar → Integratsiyalar**):

| Integratsiya | Holat |
| --- | --- |
| Demo Data Provider | ✅ ishlaydi (simulyatsiya, `source = DEMO`) |
| HTTP ingest API | ✅ ishlaydi (Pro tarifi), `source = REAL` |
| MQTT adapter | ⏳ yo‘q — interfeys tayyor |
| Modbus TCP gateway adapter | ⏳ yo‘q — interfeys tayyor |
| LLM (Anthropic) | ⚙️ ixtiyoriy, `.env` orqali |
| Email | ❌ ulanmagan |
| To‘lov tizimi | ❌ ulanmagan (obunalar demo) |
| Real uskuna boshqaruvi | ❌ yo‘q (faqat simulyatsiya) |

## 1. Real o‘lchovlarni yuborish (HTTP ingest)

1. Pro tarifini yoqing (demo rejimda: **Tariflar → Demo rejimda o‘tish**).
2. **Sozlamalar → Integratsiyalar → Token yaratish.** Token (`ec_...`) faqat bir marta ko‘rsatiladi.
3. Uskunani tahrirlang: **Ma’lumot manbasi = Real**, **Sensor identifikatori** = gateway yuboradigan `sensorId`.
   Agar uskuna “ishlab chiqaryapti / yo‘q” signalini bera olsa — “Ishlab chiqarish signali manbasi bor” ni belgilang.
4. Gateway yoki skript yuboradi:

```http
POST /api/ingest
Authorization: Bearer ec_xxxxxxxx
Content-Type: application/json

{
  "readings": [
    {
      "sensorId": "GW-01-SVR",
      "timestamp": "2026-11-27T10:00:00+05:00",
      "powerKw": 8.4,
      "intervalSeconds": 60,
      "energyKwh": 0.14,
      "isProducing": true,
      "productionCount": 3
    }
  ]
}
```

| Maydon | Majburiy | Izoh |
| --- | --- | --- |
| `sensorId` | ha | Uskunadagi “Sensor identifikatori” |
| `timestamp` | ha | ISO 8601, vaqt zonasi bilan. Intervalning **boshlanish** vaqti |
| `powerKw` | ha | Interval davomidagi o‘rtacha quvvat, **kW** |
| `intervalSeconds` | yo‘q (60) | 1–3600 |
| `energyKwh` | yo‘q | Interval energiyasi, **kWh**. Berilmasa `powerKw × intervalSeconds / 3600` |
| `isProducing` | yo‘q | Ishlab chiqarish signali |
| `productionCount` | yo‘q | Interval ichida ishlab chiqarilgan dona |

Javob: `{ ok: true, data: { accepted, duplicates, rejected: [{ sensorId, reason }] } }`. Bir xil
`(sensorId, timestamp)` qayta yuborilsa — dublikat sifatida o‘tkazib yuboriladi (idempotent). Limit: 1000 o‘lchov/so‘rov,
600 so‘rov/daqiqa/token. Kelajakdagi (5 daqiqadan ortiq) vaqtlar rad etiladi.

> Energiya hisoblagichdan kumulyativ kWh o‘qilsa, gateway ketma-ket qiymatlar farqini `energyKwh` sifatida yuborsin.

## 2. Yangi sensor adapteri (MQTT, Modbus, OPC UA ...)

`src/server/providers/sensor/types.ts` dagi `SensorDataProvider` interfeysini amalga oshiring:

```ts
export const mqttProvider: SensorDataProvider = {
  id: 'mqtt', name: 'MQTT broker', source: 'REAL', mode: 'push', implemented: true,
  description: '...',
};
```

- **push** adapterlar (MQTT subscriber, webhook) — alohida jarayon/worker sifatida xabarlarni qabul qilib,
  `ingestReadings()` (`src/server/services/integrations.ts`) logikasidan foydalanishi kerak (validatsiya, dedupe, snapshot).
- **pull** adapterlar (Modbus TCP polling) — `pull(equipment, from, to, tz)` ni amalga oshiradi; `telemetry-sync.ts`
  dagi demo tsikliga o‘xshash ishga tushiriladi.
- `registry.ts` dagi `SENSOR_PROVIDERS` ga qo‘shing — UI holatni avtomatik ko‘rsatadi.
- `implemented: false` bo‘lgan adapter UI’da “Mavjud emas” deb ko‘rsatiladi — real ulanish bor deb da’vo qilinmaydi.

Pilotdan oldin aniqlanishi kerak: hisoblagich/sensor modeli, protokol (MQTT/Modbus), ishlab chiqarish signali manbasi
(PLC chiqishi, hisoblagich impulsi), o‘lchov chastotasi.

## 3. AI provayder (LLM)

```env
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sk-ant-..."     # faqat serverda; client bundle'ga chiqmaydi
AI_MODEL="claude-opus-5-5"
```

- Faqat **Pro** (`advancedAi`) tarifidagi tashkilotlar uchun ishlatiladi; Free’da qoidaga asoslangan tahlil.
- So‘rov: `@anthropic-ai/sdk` `messages.parse` + Zod structured output, `effort: low`, 60 s timeout, 1 qayta urinish.
- Modelga faqat bazadagi qiymatlar beriladi; javobdagi `evidence` modeldan olinmaydi.
- Xato, timeout, rad etish (`stop_reason: refusal`) yoki sxemaga mos kelmaslik → rule-based fallback,
  `AIAnalysis.status = FALLBACK`, xato matni saqlanadi va UI’da “LLM ishlamadi — fallback” belgisi.
- Boshqa provayder qo‘shish: `AIProvider` interfeysi (`src/server/providers/ai/types.ts`) va `getPrimaryProvider()`.

## 4. Smart Control (real boshqaruv)

Hozir faqat `simulationControlAdapter` mavjud (DEMO uskunaning simulyatsiya holatini o‘zgartiradi).
`getRealControlAdapter()` doim `null`. Real adapter qo‘shishdan oldin **majburiy**:

1. Uskuna ishlab chiqaruvchisi va integrator bilan xavfsizlik tahlili; buyruq turlari faqat ruxsat etilganlar.
2. Uskunaga mos xavfsizlik interloklari (PLC darajasida) — EnergyComp ular o‘rnini bosmaydi; E-stop alohida.
3. Alohida ruxsat (`control.configure`) va har bir buyruq uchun ikkinchi shaxs tasdig‘i (mavjud oqim).
4. Buyruq natijasini uskunadan qaytuvchi signal bilan tasdiqlash; timeout va xato holatlari auditga.
5. AI hech qachon `requestControl`ni chaqirmaydi — bu kod darajasida saqlanishi kerak.

## 5. Email va to‘lov

`serverEnv.emailConfigured` / `paymentConfigured` hozir `false`. Ulanganda: parol tiklash havolasi va a’zo taklifi
email bilan yuboriladi (hozir: dev’da havola sahifada, a’zo uchun vaqtinchalik parol bir marta ko‘rsatiladi);
`Subscription.isDemo=false` va provayder webhook’lari.
