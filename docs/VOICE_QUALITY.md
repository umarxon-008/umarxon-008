# O‘zbekcha ovoz sifati hisoboti (prompt §8.5)

> **Holat:** test to‘plami va o‘lchash vositasi tayyor. **Haqiqiy natijalar hali yo‘q**: ular faqat haqiqiy mikrofon va
> haqiqiy Gemini kaliti bilan Windows’da o‘lchanadi. Bu yerda taxminiy yoki o‘ylab topilgan raqam yo‘q.

## Qanday o‘lchanadi
1. Sozlamalar → Sun’iy intellekt: Gemini kalitini kiriting va modelni tanlang.
2. Sozlamalar → Ovoz: “Gemini (internet)” va rozilik belgisini yoqing.
3. **“O‘zbekcha nutqni tanish aniqligi testi”** bo‘limida har bir gapni oddiy ovozda o‘qing.
4. MARIUS gapni matnga aylantiradi va **WER** (so‘z xatosi darajasi) bo‘yicha solishtiradi:
   `aniqlik = 1 − (almashtirish + tushib qolish + ortiqcha so‘z) / kutilgan so‘zlar`.
   Solishtirishda apostrof turlari (o‘ / oʻ / o'), katta-kichik harf va tinish belgilari farq qilmaydi.
5. “Hisobotni ko‘rsatish (JSON)” tugmasini bosib, natijani shu faylga qo‘shing.

## Test to‘plami
42 ta gap, 6 toifa (`src/renderer/src/features/voice/testSentences.ts`):

| Toifa | Gaplar | Nima tekshiriladi |
|---|---|---|
| qisqa buyruq | 7 | “Kalkulyatorni och.” kabi buyruqlar |
| uzun gap | 7 | Murakkab gaplar, qo‘shma so‘zlar |
| raqam va vaqt | 7 | Soat, sana, telefon raqami, hisob |
| dastur nomlari | 7 | Chrome, Visual Studio Code, Telegram… |
| aralash (rus/ingliz) | 7 | “Downloads papkasidan PDF fayllarni top.”, ruscha so‘zlar |
| tabiiy, tez | 7 | Kundalik og‘zaki nutq |

Shovqinli muhit testi: xuddi shu to‘plamni fon shovqini (masalan, televizor) bilan qayta o‘qib, natijani alohida yozing.

## Natijalar
| Sana | Kompyuter / mikrofon | Model | Muhit | Gaplar | Umumiy aniqlik | Izoh |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | Hali o‘lchanmagan |

## Matn → nutq (TTS) baholash
| Variant | O‘zbekcha talaffuz | Izoh |
|---|---|---|
| Windows tizim ovozi | Hali baholanmagan | Windows’da o‘zbekcha ovoz odatda yo‘q. MARIUS buni aniqlab, ogohlantiradi |
| Gemini ovozi (eksperimental) | Hali baholanmagan | O‘zbek tilini qo‘llashi rasmiy tasdiqlanmagan. Foydalanuvchi sinab ko‘radi |
