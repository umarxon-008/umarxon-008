# PHASE 6 hisoboti: Brauzer va YouTube

**Holat:** Kod va avtomatik testlar tayyor.

- **Veb qidiruv:** `web_search` (tasdiq bilan) so'rovni foydalanuvchining standart brauzerida ochadi. Qidiruv tizimini Sozlamalar → Internet bo'limida tanlaysiz: Google, Bing, DuckDuckGo yoki Yandex. MARIUS natijalarni o'qimaydi va buni modelga aniq aytadi.
- **YouTube:**
  - Kalit bo'lsa, `youtube_search` (L1) rasmiy YouTube Data API v3 orqali haqiqiy natija kartalarini qaytaradi: sarlavha, kanal va havola.
  - Kalit bo'lmasa, `youtube_open_search` qidiruv sahifasini brauzerda ochadi va UI buni aniq ko'rsatadi.
  - Soxta natija hech qachon ko'rsatilmaydi.
- **Havolalar:** `open_url` faqat `https`, tasdiq bilan ochiladi. Markdown'dagi havolalar ham faqat `https`.
- **Kalit:** API kaliti DPAPI bilan shifrlanadi. Faqat ASCII belgilar qabul qilinadi (test paytida topilgan xato: o'zbekcha harf HTTP sarlavhasini buzar edi).
- **Testlar:** unit (`web.test.ts`) va E2E (`web.spec.ts`, soxta YouTube serveri bilan).
