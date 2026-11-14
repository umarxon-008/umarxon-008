# MARIUS: ma'lum cheklovlar (v0.9.0 beta)

Bu ro'yxat halol yozilgan: quyidagilar **ishlamaydi** yoki **to'liq tekshirilmagan**.

## Umumiy
- **Faqat 64-bit Windows** (x64). 32-bit Windows qo'llab-quvvatlanmaydi: Electron 45 32-bit versiyada chiqarilmaydi. Kamida 4 GB RAM kerak, chunki MARIUS jarayonlari ~500–600 MB xotira ishlatadi.
- **Faqat Windows 10/11.** Interfeys macOS va Linux'da ochiladi, lekin dastur ochish, oynalar, media tugmalari va batareya faqat Windows'da ishlaydi.
- **Imzosiz installer.** Windows SmartScreen "Windows protected your PC" deb ogohlantiradi. Uni *More info → Run anyway* orqali o'tkazish mumkin. Raqamli imzo pullik sertifikat talab qiladi (R-07).
- **Haqiqiy Windows 10/11 kompyuterida inson tomonidan hali sinalmagan.** Avtomatik testlar GitHub Actions'ning `windows-latest` (Windows Server) muhitida o'tadi. Desktop Windows'da qo'lda tekshirish kerak: [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).
- **Avtomatik yangilanish yo'q.** Yangi versiyani qo'lda o'rnatasiz. Ma'lumotlar saqlanib qoladi.
- Ma'lumotlar `%APPDATA%\MARIUS` (Roaming) papkasida turadi. Domen tarmog'ida bu papka sinxronlanishi mumkin (R-21).

## AI
- **Bepul Gemini limiti.** Daqiqasiga yoki kuniga so'rovlar soni cheklangan. Limit tugasa, MARIUS buni aytadi va kutish kerak bo'ladi.
- Ro'yxatdagi barcha Gemini modellari ham vositalar (tools), audio yoki rasmni qo'llamasligi mumkin. Model nomlari API'dan olinadi va oldindan sinalmaydi.
- **Ollama:** o'zbek tili sifati modelga bog'liq. Kichik modellar vositalarni qo'llamasa, MARIUS vositalarsiz javob beradi. Kompyuter kuchli bo'lishi kerak (16 GB+ RAM tavsiya etiladi).
- MARIUS internetdan **o'zi ma'lumot o'qimaydi**: qidiruv faqat brauzerda ochiladi, eng so'nggi yangiliklarni bilmaydi.

## Ovoz
- **Nutqni matnga aylantirish faqat Gemini orqali** (internet, rozilik bilan). Lokal (internetsiz) STT yo'q.
- O'zbekcha tanish aniqligi haqiqiy foydalanuvchilarda **o'lchanmagan**. Ilova ichida aniqlik testi bor (Sozlamalar → Ovoz).
- Windows'da odatda **o'zbekcha tizim ovozi yo'q**, shuning uchun boshqa tildagi ovoz noto'g'ri talaffuz qiladi. Gemini ovozi eksperimental.
- Wake word ("Hey MARIUS") va uzluksiz real-time suhbat yo'q: tugma bosib gapiriladi, eng ko'pi 30 soniya.

## Kompyuter amallari
- Faqat Start menyusidagi dasturlar ochiladi. Fonda yoki tray'da ishlaydigan dasturlarda oyna chiqmaydi, shuning uchun natija "tekshirib bo'lmadi" deb ko'rsatilishi mumkin.
- Media tugmalari ovoz darajasini o'qiy olmaydi: "tugma bosildi" deyiladi, "ovoz 40% bo'ldi" deyilmaydi.
- Ixtiyoriy klaviatura yoki sichqoncha boshqaruvi, matn yozish va buyruq (shell) bajarish **ataylab yo'q**.

## Fayllar
- Faqat ruxsat berilgan papkalarda ishlaydi. **O'chirish yo'q**, ustiga yozish yo'q, fayl mazmuni o'qilmaydi va AI'ga yuborilmaydi.
- Qidiruv nom, kengaytma va sana bo'yicha ishlaydi, mazmun bo'yicha emas.

## Internet va YouTube
- YouTube natija kartalari faqat YouTube Data API kaliti bilan chiqadi (kunlik kvota bor). Kalitsiz faqat brauzerda qidiruv ochiladi.
- Login, CAPTCHA yoki sayt himoyasini chetlab o'tish yo'q va bo'lmaydi.

## Eslatmalar va xotira
- MARIUS **to'liq yopiq** bo'lsa (tray o'chiq), eslatma vaqtida chiqmaydi, keyingi ochilishda "o'tkazib yuborilgan" deb ko'rsatiladi. Yechim: "Yopilganda tray'da qolish" va "Windows bilan birga ishga tushish".
- Windows bildirishnomalari o'chirilgan bo'lsa, faqat ilova ichidagi xabar chiqadi.
- Takrorlanadigan eslatmalar ("har dushanba") yo'q.
- Semantik (ma'no bo'yicha) xotira qidiruvi yo'q, oddiy matn qidiruvi bor.

## Obsidian
- Qidiruv oddiy: eng ko'pi 5000 note, 1 MB dan katta note'lar faqat nomi bo'yicha. FTS5 indeksi keyingi versiyaga qoldirildi.
- Mavjud matnni tahrirlash yoki note o'chirish yo'q: faqat yangi note yaratish va oxiriga qo'shish.
- Vault OneDrive yoki Obsidian Sync bilan sinxronlansa, MARIUS yozgan note ham o'sha yerga ketadi (R-20).

## Ekran tahlili
- Faqat asosiy monitor, bitta rasm. Doimiy kuzatish yo'q.
- Lokal Ollama'da rasmni tushunadigan model bo'lmasa, rasm Google Gemini'ga yuboriladi. Bu tasdiq oynasida aytiladi.
- MARIUS oynasi rasm olish paytida bir lahzaga yashirinadi. Bu ataylab qilingan va foydalanuvchi uchun ko'rinadigan indikator.

## Zaxira nusxa
- API kalitlari zaxiraga **kirmaydi** (xavfsizlik uchun). Boshqa kompyuterda qayta kiritish kerak.
- Tiklash keyingi ishga tushishda qo'llanadi.

## Xavfsizlik (dasturchilar uchun)
- `npm audit`: installer'ga kiradigan paketlarda zaiflik **0** (CI tekshiradi). Dev vositalarida (`eslint`, `electron-builder` ichidagi `minimatch`) 12 ta "moderate" zaiflik bor. Ular faqat build vaqtida, ishonchli glob naqshlar bilan ishlaydi. `npm audit fix --force` eski versiyalarga qaytaradi, shuning uchun qo'llanmadi (R-16).
- `node:sqlite` Node'da hali "experimental" belgisida (R-17).
