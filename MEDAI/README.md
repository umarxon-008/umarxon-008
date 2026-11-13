# MEDAI — Medical Artificial Intelligence Assistant

MEDAI — tibbiy maʼlumotlarni sodda oʻzbek tilida tushuntiruvchi web-platforma (MVP). U PHARMA GUARD AI ekotizimining alohida moduli.

> ⚠️ **MEDAI shifokor emas.** U tashxis qoʻymaydi, davolash belgilamaydi va dori dozasini tavsiya qilmaydi yoki oʻzgartirmaydi. Shoshilinch holatda **103** (tez yordam) yoki **112** ga qoʻngʻiroq qiling.

---

## Imkoniyatlar

| Boʻlim | Nima qiladi |
|---|---|
| **AI yordamchi** | Chat. Enter bilan yuborish, Shift+Enter bilan yangi qator. Xavfsiz Markdown, manbalar va sana, javobni nusxalash, «foydali boʻldimi?» bahosi, xatoda «Qayta urinish». Shoshilinch holat, tashxis va doza soʻrovlari uchun xavfsizlik qoidalari ishlaydi. |
| **Tibbiy tahlil** | PDF, JPG yoki PNG faylni drag-and-drop bilan yuklaydi. Ish 3 bosqichda boradi: **yuklash → qiymatlarni tasdiqlash → natija**. Har bir qiymat faqat hujjatda yozilgan meʼyoriy oraliq bilan solishtiriladi. Oraliq boʻlmasa, MEDAI uni oʻzidan qoʻymaydi. Natijada maʼnosi, cheklovlar va shifokorga beriladigan savollar chiqadi. |
| **Dori qoʻllanmasi** | Dori nomi, yoʻriqnoma fayli (PDF/TXT; rasm faqat AI rejimida) yoki joylashtirilgan matn qabul qilinadi. Natijada quyidagi boʻlimlar chiqadi: faol modda, qoʻllanish sohasi, qarshi koʻrsatmalar, nojoʻya taʼsirlar, oʻzaro taʼsirlar, saqlash shartlari, manba va sana. **Dozalash boʻlimi ataylab koʻrsatilmaydi.** |
| **Tibbiy kutubxona** | 10 ta atama. Qidiruv, turkum boʻyicha filtr va batafsil oyna bor. Har bir atamada sodda taʼrif, tibbiy izoh, bogʻliq tushunchalar va manba beriladi. |
| **Suhbatlar tarixi** | Suhbat nomi avtomatik yaratiladi. Qidiruv, ochish va oʻchirish (tasdiqlash dialogi bilan) mavjud, oxirgi xabar vaqti koʻrsatiladi. Tarix **faqat shu qurilmada** (localStorage) saqlanadi. |
| **Profil va sozlamalar** | Ism (ixtiyoriy), tarixni saqlashni yoqish/oʻchirish, animatsiyalarni kamaytirish, tizim holati va barcha maʼlumotlarni oʻchirish. |

Interfeys toʻliq **oʻzbek tilida** (lotin yozuvi). Rus va ingliz tillari uchun tuzilma tayyor (`js/i18n.js`).

---

## Ishga tushirish

**Talab:** Node.js 18.17 yoki undan yangi versiya (22 LTS tavsiya etiladi).

```bash
cd MEDAI
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm start
```

Brauzerda oching: **http://localhost:3000**

Bu holatda MEDAI **bepul DEMO rejimda** ishlaydi: API kaliti kerak emas va hech qanday pullik xizmat chaqirilmaydi.

### Rejimlar

| | Demo rejim (standart) | AI rejimi |
|---|---|---|
| Qanday yoqiladi | `.env` da `ANTHROPIC_API_KEY` boʻsh | `.env` ga API kaliti yoziladi va server qayta ishga tushiriladi |
| Narx | Bepul | Anthropic API ishlatilgan tokenlar boʻyicha pullik |
| Chat | Qoidaga asoslangan javoblar: kutubxonadagi 10 ta atama, 4 ta umumiy mavzu va xavfsizlik javoblari. Qolgan savollarga «manba topilmadi» deb javob beradi. | Claude modeli javob beradi |
| Tahlil | Matnli PDF: koʻrsatkichlar algoritm bilan ajratiladi. Rasm yoki skanerlangan PDF: qiymatlar qoʻlda kiritiladi (OCR yoʻq). | PDF va rasmni AI oʻqiydi |
| Dori | PDF/TXT/matn sarlavhalar boʻyicha boʻlimlarga ajratiladi. Nom boʻyicha qidiruv **mavjud emas**. | Nom, fayl va matn bilan ishlaydi |

Demo javoblar interfeysda doim **«DEMO · qoidaga asoslangan javob (AI emas)»** deb belgilanadi. Soxta AI javobi hech qachon koʻrsatilmaydi.

### AI ni ulash

1. https://platform.claude.com da API kalit oling.
2. `.env` fayliga `ANTHROPIC_API_KEY=...` qatorini yozing. Arzonroq ishlatish uchun `MEDAI_MODEL=claude-sonnet-5-5` ni tanlash mumkin.
3. `npm start` bilan serverni qayta ishga tushiring. Yuqori panelda «AI ulangan» yozuvi chiqadi.

> AI rejimidagi kod rasmiy SDK hujjatlari asosida yozilgan. U **haqiqiy kalit bilan sinalmagan**, chunki ishlab chiqish muhitida kalit boʻlmagan. Faqat «AI xizmati ishlamadi» holati sinalgan.

---

## Loyiha tuzilmasi

```
MEDAI/
  index.html               — yagona sahifali ilova (SPA, hash router)
  css/style.css            — dizayn tizimi (ranglar, komponentlar)
  css/responsive.css       — desktop / laptop / planshet / mobil
  js/app.js                — ishga tushirish, router, server holati
  js/chat.js               — AI yordamchi
  js/upload.js             — Tibbiy tahlil (yuklash → tasdiqlash → natija)
  js/medicine.js           — Dori qoʻllanmasi
  js/library.js            — Tibbiy kutubxona
  js/history.js            — Suhbatlar tarixi
  js/settings.js           — Profil va sozlamalar
  js/api.js                — server API mijozi (kalit brauzerda yoʻq)
  js/store.js              — localStorage qatlami
  js/ui.js                 — toast, modal, tasdiqlash, drawer, menyu
  js/utils.js              — xavfsiz Markdown, DOM yordamchilari
  js/lab.js, dropzone.js, i18n.js
  data/medical-terms.json  — kutubxona maʼlumotlari
  assets/icons/            — logotip
  assets/samples/          — SINTETIK namuna tahlil (PDF)
  server/server.js         — Express: statik fayllar + API, xavfsizlik sarlavhalari
  server/config.js         — .env sozlamalari
  server/routes/           — chat, analyze, medicine, status
  server/services/         — ai.js (Claude), demo.js, safety.js, labParser.js,
                             leafletParser.js, files.js, library.js, prompts.js
  server/rag/index.js      — RAG interfeysi (hali ulanmagan)
  tests/unit/              — parser, xavfsizlik va API testlari (node:test)
  tests/e2e/run-e2e.mjs    — brauzer testlari (Playwright)
  scripts/make-fixtures.mjs — sintetik test fayllarini yaratish
```

## API

| Endpoint | Kirish | Izoh |
|---|---|---|
| `GET /api/status` | — | Rejim (`demo`/`ai`), model, RAG holati |
| `POST /api/chat` | `{ messages: [{role, content}] }` | Oxirgi 20 ta xabar. Har bir xabar koʻpi bilan 4000 belgi |
| `POST /api/analyze-report` | `multipart: file` | PDF/JPG/PNG, koʻpi bilan 10 MB |
| `POST /api/explain-medicine` | `{ name }` yoki `{ text }` yoki `multipart: file` | PDF/TXT/JPG/PNG |

---

## Xavfsizlik va maxfiylik

- **API kaliti** faqat serverdagi `.env` faylida turadi. `.env` Git'ga qoʻshilmaydi va kalit brauzerga yuborilmaydi.
- **XSS:** foydalanuvchi va AI matni avval toʻliq escape qilinadi, keyin faqat ruxsat etilgan Markdown teglari qoʻshiladi. Havolalar faqat `http(s)` boʻlishi mumkin. Qatʼiy CSP qoʻllangan (`script-src 'self'`, inline skript yoʻq).
- **Fayllar** kengaytma, MIME turi, ichki imzo (magic bytes) va hajm boʻyicha brauzerda ham, serverda ham tekshiriladi. Ular faqat xotirada qayta ishlanadi: diskka, logga yoki localStorage'ga yozilmaydi.
- **Server:** input validatsiya, soʻrov hajmi cheklovi (JSON 100 KB, fayl 10 MB), IP boʻyicha rate limit va `helmet` sarlavhalari bor. Xatolarda texnik tafsilot koʻrsatilmaydi. Tibbiy matn `console.log` qilinmaydi.
- **Tibbiy xavfsizlik:** shoshilinch holat belgilari aniqlansa, 103/112 ogohlantirishi chiqadi. Tashxis va doza soʻrovlari xavfsiz tarzda rad etiladi. AI uchun system prompt promptdagi barcha qoidalarni oʻz ichiga oladi (`server/services/prompts.js`).
- **Takroriy soʻrov:** javob kutilayotganda yangi soʻrov yuborilmaydi.

## Testlar

```bash
npm test             # 17 ta unit va API test (Node test runner)
npm run test:e2e     # 29 ta brauzer testi (Playwright kerak: npm i -D playwright && npx playwright install chromium)
npm run fixtures     # sintetik namuna fayllarni qayta yaratish
```

**Oxirgi natija:** unit/API — 17/17 ✔, E2E — 29/29 ✔. Barcha testlarda faqat sintetik maʼlumotlar ishlatilgan.

| Promptdagi test | Holat |
|---|---|
| 1. Oddiy oʻzbekcha savol | ✔ |
| 2. Boʻsh xabar | ✔ yuborilmaydi, ogohlantirish chiqadi |
| 3. Juda uzun xabar | ✔ UI 4000 belgida cheklaydi, server >4000 belgini rad etadi |
| 4. API ishlamagan holat | ✔ xato xabari va «Qayta urinish» tugmasi chiqadi |
| 5. PDF yuklash | ✔ 8 ta koʻrsatkich ajratildi va toʻgʻri baholandi |
| 6. Notoʻgʻri format | ✔ brauzerda va serverda (415) rad etiladi; soxta «.pdf» ham rad etiladi |
| 7. Juda katta fayl | ✔ brauzerda va serverda (413) rad etiladi |
| 8. OCR xatosi / skan | ✔ ogohlantirish chiqadi va qoʻlda kiritishga oʻtiladi; barcha qiymatlarni foydalanuvchi tasdiqlaydi |
| 9. Tashxis soʻrovi | ✔ xavfsiz rad javobi |
| 10. Dozani oʻzgartirish | ✔ xavfsiz rad javobi |
| 11. Manba topilmagan | ✔ «Manba topilmadi» deb ochiq aytiladi |
| 12. Mobil va desktop | ✔ 390, 768, 1024 va 1440 px; gorizontal scroll yoʻq |
| 13. Navigatsiya | ✔ barcha boʻlimlar, profil menyusi, holat oynasi va til tanlash |
| 14. Tarixni saqlash va oʻchirish | ✔ sahifa qayta yuklangandan keyin saqlanadi; oʻchirish tasdiqlash bilan |

Qoʻshimcha sinalganlar: XSS, shoshilinch holat banneri, yuklashni bekor qilish, forma validatsiyasi, nusxalash va baho, klaviatura (Tab, Escape, strelkalar), maxfiy fayllarning yopiqligi, CSP.

## Maʼlum cheklovlar

1. **RAG ulanmagan.** Ishonchli hujjatlar bazasi yoʻq, shuning uchun AI javoblari «rasmiy manba bilan tasdiqlangan» deb koʻrsatilmaydi va bu interfeysda ochiq yoziladi.
2. **Kutubxona matnlari tibbiy ekspert tomonidan tekshirilmagan.** Manba havolalari (MedlinePlus, WHO) ishlab chiqish muhitida tarmoq cheklovi tufayli ochib tekshirilmagan.
3. **Demo rejimda OCR yoʻq.** Rasm va skanerlangan PDF uchun qiymatlar qoʻlda kiritiladi.
4. **Laboratoriya tahlilchisi** «Nomi Qiymat Birlik Oraliq» koʻrinishidagi satrlarni oʻqiydi. Murakkab jadvalli PDF lar notoʻgʻri oʻqilishi mumkin, shu sababli tasdiqlash bosqichi majburiy.
5. **AI rejimi haqiqiy kalit bilan sinalmagan** (yuqoriga qarang).
6. Rus va ingliz tillari hali qoʻshilmagan. Tanlanganda xabar chiqadi va interfeys oʻzbek tilida qoladi.
7. Tarix faqat brauzerda saqlanadi: akkaunt va sinxronizatsiya yoʻq.

## RAG ni qoʻshish rejasi (keyingi bosqich)

`server/rag/index.js` dagi interfeysni amalga oshirish kerak:

1. Ishonchli hujjatlarni qabul qilish: Sogʻliqni saqlash vazirligi, ishlab chiqaruvchilarning rasmiy yoʻriqnomalari, WHO. Har bir manbaning haqiqiyligi, sanasi va foydalanish huquqi tekshiriladi.
2. Matnni ajratish (PDF/HTML).
3. Bo'laklarga ajratish (~800 token, 100 token ustma-ust).
4. Embedding yaratish va vektor bazaga saqlash.
5. `searchSources(query)` orqali tegishli bo'laklarni topish.
6. Topilgan bo'laklarni AI soʻroviga `<manbalar>` sifatida qoʻshish va «faqat shu manbalarga tayan» koʻrsatmasini berish.
7. Javob ostida hujjat nomi, boʻlimi va sanasini koʻrsatish. `chat.js` bunga allaqachon tayyor (`sources` maydoni).
