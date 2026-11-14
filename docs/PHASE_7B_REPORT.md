# PHASE 7B hisoboti: Local data, zaxira va Obsidian (v2.1)

**Holat:** Kod va avtomatik testlar tayyor. Haqiqiy Obsidian Vault bilan Windows'da qo'lda sinash kerak (§10).

## Ma'lumotlar qayerda saqlanadi
- Sozlamalar → Maxfiylik: "Ma’lumotlar qayerda saqlanadi?" bo'limi. SQLite bazasi `%APPDATA%\MARIUS` ichida, API kalitlari Windows DPAPI bilan shifrlangan. Bulutga avtomatik yuborish yo'q.
- **Zaxira nusxa:** SQLite `VACUUM INTO` orqali bitta `.db` fayl. Nusxadan `secrets` jadvali tozalanadi, shuning uchun API kalitlari zaxiraga **kirmaydi**.
- **Tiklash:** fayl tekshiriladi (MARIUS bazasimi, migratsiya versiyasi mosmi), so'ng **keyingi ishga tushishda** qo'llanadi. Bu ochiq bazani almashtirishdan xavfsizroq. Joriy API kalitlari saqlanib qoladi. MARIUS'ga tegishli bo'lmagan fayl rad etiladi.

## Obsidian (v2.1 §1–§9)
- **Standart holatda o'chiq.** Obsidian o'rnatilmagan bo'lsa ham MARIUS to'liq ishlaydi. Holat matni: "o‘rnatilgan" yoki "topilmadi (ixtiyoriy)".
- Vault tanlash: mavjud Vault (`.obsidian` papkasi tekshiriladi) yoki yangi papka yaratish. Tanlash **faqat o'qish** ruxsatini yoqadi.
- Uchta alohida ruxsat: **O'qish**, **Yangi note yaratish**, **Mavjud note oxiriga qo'shish**. Yozish ruxsatlari faqat foydalanuvchi o'zi yoqsa ishlaydi.
- Fayl tizimi orqali ishlaydi (Obsidian plaginlari yoki URI kerak emas). Barcha yo'llar path guard'dan o'tadi: `..`, symlink, junction, UNC va Vault'dan tashqariga chiqish bloklanadi. Faqat `.md` fayllar.
- **Ustiga yozish yo'q:** yangi note `wx` bayrog'i bilan yaratiladi, nomi band bo'lsa xato beradi. **O'chirish yo'q.**
- **Poyga holati:** oxiriga qo'shishda note oldindan ko'rsatilgandan keyin Obsidian'da o'zgartirilgan bo'lsa (mtime farq qilsa), amal rad etiladi.
- Note formati: YAML frontmatter (`created`, `source: MARIUS`), sarlavha va matn.
- **AI vositalari:**
  - `vault_search` (L1): nom va matn bo'yicha qidiradi, parchalar bilan.
  - `vault_read_note` (L2): tasdiq so'raydi va "matn AI provayderga yuboriladi" deb ogohlantiradi.
  - `vault_create_note` (L2): oldindan ko'rish bilan.
  - `vault_append_note` (L3): oldindan ko'rish bilan.
- Tasdiq oynasi endi yoziladigan matnni oldindan ko'rsatadi ("Oldindan ko‘rish").
- Note matni modelga **ishonchsiz ma'lumot** sifatida beriladi. Ichidagi "buyruq"lar bajarilmaydi.
- "Indeksni tozalash" va "Uzish" tugmalari bor. Uzish barcha ruxsatlarni o'chirib, Vault yo'lini unutadi.

## Rejadan farq (halol)
- ROADMAP'da FTS5 indeksi va alohida worker rejalashtirilgan edi. Hozircha **mtime kesh bilan oddiy qidiruv** qilindi: eng ko'pi 5000 note, 1 MB dan katta note'larning faqat nomi bo'yicha qidiriladi, bekor qilish (AbortSignal) bor. Bir necha ming note uchun bu yetarli. Juda katta Vault'lar uchun FTS5 keyingi versiyaga qoldirildi (KNOWN_LIMITATIONS'ga yoziladi).

## Testlar
- Unit: 213, shundan 12 tasi Obsidian va zaxira uchun:
  - §9 B, C, D, E, F, G, H, I;
  - symlink orqali qochish;
  - mtime poyga holati;
  - o'zbekcha harflar va emoji;
  - zaxirada kalit yo'qligi;
  - tiklashda kalitlar saqlanishi;
  - begona faylni rad etish.
- E2E: 29.
  - Obsidian: Vault tanlash faqat o'qishni yoqadi. Ruxsat yo'qligida AI so'rovi bilan fayl yaratilmaydi. Ruxsat yoqilgach, oldindan ko'rish va tasdiq bilan yaratiladi. Uzish hammasini o'chiradi.
  - Zaxira fayli yaratiladi.
- Typecheck va lint xatosiz.

## Windows'da qo'lda tekshirish
1. Haqiqiy Obsidian Vault'ni tanlang. Note soni to'g'ri chiqishini tekshiring.
2. Chatda: "Obsidian'da imtihon haqida nima yozganman?"
3. "Yangi note yaratish"ni yoqing va AI'dan note yaratishni so'rang. Oldindan ko'rish chiqadi va tasdiqlagandan keyin note Obsidian'da ko'rinadi.
4. Zaxira oling. Keyin tiklang va ilovani qayta ishga tushiring.
