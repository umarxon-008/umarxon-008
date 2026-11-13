# PHASE 2 hisoboti: Chat (AI suhbat)

**Sana:** 2026-11-13
**Holat:** Kod tayyor, Linux'da testlangan. Windows CI va foydalanuvchi sinovi kutilmoqda.

## Qilingan ishlar

### AI provayderlar (foydalanuvchi tanlovi: ikkalasi ham bepul)
| Provayder | Qayerda ishlaydi | Kalit | Ma'lumot qayerga ketadi |
|---|---|---|---|
| **Google Gemini** | Internet (Google serverlari) | Bepul kalit (Google AI Studio) | Xabarlar Google'ga yuboriladi. UI'da aniq ogohlantirish bor |
| **Ollama** | Foydalanuvchi kompyuteri | Kerak emas | Kompyuterdan chiqmaydi (manzil lokal bo'lsa) |

- `AIProvider` interfeysi: `getCapabilities`, `listModels`, `streamChat` (ARCHITECTURE §5). Function calling PHASE 4 da (tool registry bilan).
- **Model nomlari kodga yozilmagan**: kalit kiritilgach yoki Ollama ulangach API'dan olinadi va foydalanuvchi tanlaydi.
- **API ma'lumotlari manbasi** (prompt §7: "uydirma"):
  - Ollama: rasmiy `docs/api.md` (github.com/ollama/ollama): `GET /api/tags`, `POST /api/chat`, NDJSON.
  - Gemini: `ai.google.dev` bu muhitdan ochilmadi, shuning uchun Google'ning rasmiy `@google/genai` SDK (v3.3.0) manba kodidan tasdiqlandi: `generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`, header `x-goog-api-key`, `contents` / `systemInstruction` / `generationConfig`, rollar `user` / `model`, `supportedGenerationMethods`, `pageToken` / `nextPageToken`.
- Xatolar o'zbekchaga aylantiriladi: noto'g'ri kalit, limit (429), internet yo'q, timeout, Ollama ishlamayapti, model topilmadi, xavfsizlik bloki.
- Timeout: javob boshlanmasa (Gemini 30 s, Ollama 180 s, chunki model xotiraga yuklanadi) va bo'laklar orasida 60 s jimlik bo'lsa.

### API kalit xavfsizligi
- Kalit faqat main process'ga yuboriladi, `safeStorage` (Windows: **DPAPI**) bilan shifrlanib `secrets` jadvaliga yoziladi. `provider_settings` jadvalida faqat havola (`secret_ref`) saqlanadi.
- Shifrlash mavjud bo'lmasa, kalit **saqlanmaydi**: ochiq matnga "fallback" yo'q.
- Kalit renderer'ga qaytarilmaydi ("kalit saqlangan" belgisi ko'rsatiladi), logga yozilmaydi va URL'da emas, header'da yuboriladi.

### Suhbat
- Oqimli (streaming) javob, **to'xtatish** tugmasi, xatodan keyin **qayta urinish**.
- Suhbatlar ro'yxati, yangi suhbat, suhbatni o'chirish (tasdiq bilan), barcha suhbatlarni o'chirish (Sozlamalar → Maxfiylik).
- **"Suhbat tarixini saqlash"** sozlamasi (prompt v2.1 §2). O'chirilsa, yangi suhbatlar faqat xotirada turadi.
- Ilova crash bo'lsa, yarim qolgan javob "error / INTERRUPTED" deb belgilanadi va "bajarildi" deb taxmin qilinmaydi (§21).
- Kontekst: oxirgi 24 ta xabar va 24 000 belgigacha. Xato bilan tugagan javoblar modelga yuborilmaydi.
- **Tizim ko'rsatmasi** (`system-prompt.ts`): o'zbek tili, MARIUS nomi; hozircha kompyuterda amal bajara olmasligi va buni "bajardim" deb aytmasligi; prompt injection'ga qarshi qoida.
- AI javobidagi Markdown xavfsiz ko'rsatiladi: o'z parserimiz React elementlarini yaratadi, HTML yo'q, shuning uchun XSS imkonsiz.
- Bosh sahifada so'nggi suhbat va tezkor yozish maydoni.

### Ma'lumotlar bazasi
Migratsiya v2: `secrets`, `provider_settings`, `conversations`, `messages` (indekslar, `ON DELETE CASCADE`).

## Testlar (Linux dev konteyner)
| Tekshiruv | Natija |
|---|---|
| typecheck / lint / build | ✅ |
| Unit | ✅ 82/82. Yangilari: SSE/NDJSON parser (UTF-8 harf bo'linishi bilan), Gemini adapter (URL, header, body, 5 xil HTTP xato, blok, tarmoq, bekor qilish, timeout, sahifalash), Ollama adapter, SecretStore (DB faylida ochiq matn yo'qligi), suhbat ombori (SQLite + xotira, cascade, crash tiklash, o'zbekcha matn), ChatService (oqim, to'xtatish, xato, qayta urinish, BUSY, sozlanmagan holat, tarix o'chiq), kontekst qisqartirish, Markdown |
| E2E | ✅ 11/11. Yangilari: soxta AI serverga **haqiqiy HTTP** bilan: Ollama'ni UI orqali sozlash → yuborish → oqim → restartdan keyin saqlangan; to'xtatish; xato → qayta urinish; AI sozlanmagan holat; Gemini kaliti (Windows'da shifrlangan saqlash va chat; Linux'da saqlash rad etilishi). DB va loglarda kalit ochiq matnda yo'qligi tekshiriladi |

## Windows'da hali tekshirilmagan
- DPAPI bilan kalit saqlash: Windows CI E2E'da avtomatik tekshiriladi (`process.platform === 'win32'` sharti).
- **Haqiqiy** Gemini kaliti va haqiqiy Ollama bilan o'zbekcha suhbat: foydalanuvchi qo'lda sinaydi (testda soxta server ishlatiladi).

## Ma'lum cheklovlar
- MARIUS hali kompyuterda amal bajara olmaydi (PHASE 4). Model shuni ochiq aytadi.
- Ovozli kiritish (STT) va ovozli javob (TTS) PHASE 3 da.
- Bepul Gemini limiti Google tomonidan belgilanadi. Limit tugasa, tushunarli xabar chiqadi.
