# PHASE 3 hisoboti: Voice MVP

**Sana:** 2026-11-13
**Holat:** Kod va avtomatik testlar tayyor. Haqiqiy mikrofon va Gemini bilan o‘zbekcha sifat Windows’da o‘lchanishi kerak.

## Tanlangan yechimlar (bepul talabiga ko‘ra)
| Vazifa | Variant | Qayerda | Maxfiylik |
|---|---|---|---|
| Nutq → matn | **Gemini** (o‘sha bepul kalit, `generateContent` + `inlineData audio/wav`) | Cloud | **Alohida rozilik** belgisisiz audio yuborilmaydi (main process’da tekshiriladi) |
| Matn → nutq | **Windows tizim ovozi** (`speechSynthesis`) | Lokal | Kompyuterdan chiqmaydi |
| Matn → nutq | **Gemini ovozi** (`responseModalities: AUDIO`), eksperimental | Cloud | UI’da ogohlantirish |

- Ollama nutqni tanimaydi. Lokal STT (whisper.cpp) og‘ir native qism talab qiladi, shuning uchun keyingi versiyaga qoldirildi (`ROADMAP`).
- API maydonlari rasmiy `@google/genai` SDK manba kodidan tasdiqlangan (`inlineData {mimeType, data}`, `audio/wav` qo‘llanadi, `speechConfig`, TTS natijasi 16-bit PCM 24 kHz).
- Gemini ovoz modellari ro‘yxatdan (nomida “tts”) tanlanadi, kodga yozilmagan.

## Qilingan ishlar
- **Push-to-talk:** bosish → gapirish → yana bosish; 30 soniyada avtomatik to‘xtaydi (yozilgan qismi matnga aylantiriladi). “● yoqiq” indikatori ko‘rinib turadi.
- **Yozuv:** 16 kHz mono 16-bit WAV (o‘z kodlovchimiz, brauzer kodeklariga bog‘liq emas). Faqat xotirada turadi. Jimlik yoki juda qisqa yozuv yuborilmaydi.
- **Transkriptni tahrirlash:** bosh sahifada matn ko‘rsatiladi, uni tuzatib yuborish, qayta gapirish yoki bekor qilish mumkin. Suhbat sahifasida mikrofon matnni yozish maydoniga qo‘yadi.
- **Ovozli javob:** play, pause, stop. Har bir javob ostida “Ovoz chiqarib o‘qish” tugmasi. “Ovozli savolga ovozli javob” sozlamasi. Kod bloklari o‘qilmaydi (“Kod namunasi ekranda”). Uzun matn gaplar bo‘yicha bo‘linadi. TTS ishlamasa ham matnli javob ko‘rinadi.
- **Holat mashinasi** (`machine.ts`): IDLE, LISTENING, TRANSCRIBING, REVIEW, THINKING, SPEAKING, ERROR (+ 4-bosqich uchun AWAITING_CONFIRMATION, EXECUTING). Noto‘g‘ri ketma-ketliklar rad etiladi, bir vaqtda ikki audio jarayon boshlanmaydi.
  ⚠️ Promptdagi ro‘yxatdan farqi: transkriptni tahrirlash uchun **REVIEW** holati qo‘shildi (§8.1 talabi).
- **Shar** barcha holatlarga javob beradi: tinglashda mikrofon ovozi, gapirishda MARIUS ovozi (Gemini: real to‘lqin, tizim ovozi: so‘z chegaralaridagi puls), o‘ylashda tez puls.
- **Xatolar:** mikrofon yo‘q, ruxsat berilmagan, band; rozilik yo‘q; kalit yo‘q; limit; tarmoq. Barchasi o‘zbekcha.
- **Aniqlik testi** (§8.5): 42 gap, 6 toifa, WER bo‘yicha o‘lchash, toifalar jadvali, JSON hisobot (`docs/VOICE_QUALITY.md`).

## Testlar
| Tekshiruv | Natija (Linux) |
|---|---|
| typecheck / lint / build | ✅ |
| Unit | ✅ 111. Yangilari: WAV kodlash (RIFF sarlavha, 48→16 kHz, PCM chegaralari, base64), jimlikni aniqlash, Gemini PCM dekodlash, holat mashinasi (to‘g‘ri yo‘l, noto‘g‘ri ketma-ketliklar, bekor qilish), Gemini audio adapteri, VoiceService rozilik qoidalari (roziliksiz audio **yuborilmaydi**), WER, matn tozalash |
| E2E | ✅ 14. Yangilari: roziliksiz yozuv yuborilmaydi (UI va to‘g‘ridan-to‘g‘ri IPC); **to‘liq zanjir**: Chromium sinov mikrofoni → WAV (RIFF, 16 kHz serverda tekshiriladi) → transkript → tahrir → chat → Gemini ovozi → to‘xtatish; Ovoz sozlamalari saqlanishi |

## Windows’da qo‘lda tekshirish kerak
1. Haqiqiy mikrofon bilan bosh sahifada gapirib ko‘rish: shar ovozga qarab harakatlanadimi, transkript to‘g‘rimi?
2. Aniqlik testida kamida 15–20 ta gap o‘qib, natijani `docs/VOICE_QUALITY.md` ga qo‘shish.
3. Windows ovozi va Gemini ovozi bilan “Sinab ko‘rish”: o‘zbekcha talaffuz qanday?
4. Windows Sozlamalari → Maxfiylik → Mikrofon o‘chiq bo‘lsa: tushunarli xato chiqadimi?

## Ma’lum cheklovlar
- Lokal (internetsiz) STT yo‘q.
- Wake word (“MARIUS” deb chaqirish) V2 da (prompt §8.3).
- Gemini ovozining o‘zbek tilidagi sifati noma’lum, shuning uchun “eksperimental” deb belgilangan.
