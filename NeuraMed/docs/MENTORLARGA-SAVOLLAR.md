# NeuraMed — mentorlarga savollar

**Toshkent AI Hackathon · Tibbiyot yoʻnalishi · Muammo №17 — mahalliy dori vositalariga ishonchning pastligi**

Har bir mentor bilan sessiya **10 daqiqa** davom etadi va mentorlar alohida tinglaydi. Har bir mentor 5 ta mezon boʻyicha 1–10 ball qoʻyadi. Savollar shu mezonlarga bogʻlangan (T1–T5, B1–B5, S1–S5).

**Har bir sessiyada quyidagi tartibda ishlang:**
1. 1 daqiqa demo koʻrsating: bemor → shifokor → PHARMA TRACE.
2. Shu mentor uchun **⭐ belgilangan 2–3 ta savolni** bering.
3. Javoblarni yozib oling.
4. Oxirida umumiy savolni bering: *"Sizning mezonlaringiz boʻyicha ballimizni oshirish uchun finalgacha bitta eng muhim narsa nima?"*

---

## 1. Texnik mentor
*Yechimning texnik jihati va kod tayyorligini baholaydi.*

**T1 — Texnik amalga oshirilish**

1. ⭐ Bizda ikki rol bor: bemor va shifokor. Rol JWT tokenda saqlanadi, sahifalarni middleware, har bir API'ni esa alohida tekshiruv himoya qiladi. Shifokor faqat oʻziga yozilgan va ruxsat bergan bemorni koʻradi. Tibbiy tizim uchun shu yetarlimi yoki kim qaysi maʼlumotni ochganini yozib boradigan audit jurnali ham kerakmi?
2. Maʼlumotlar Prisma orqali PostgreSQL'da saqlanadi; u boʻlmasa, lokal bazada ishlaydi. Finalgacha bulutga joylab, jonli havola berishni tavsiya qilasizmi?

**T2 — Kod tayyorligi**

3. ⭐ Bizda 32 ta avtomatik test bor: unit testlar va brauzer testlari, telefon oʻlchami tekshiruvi ham bor. Qaysi qismni yana test bilan qoplash eng muhim deb bilasiz?
4. Kodni koʻrganingizda birinchi navbatda nimaga qaraysiz: arxitekturagami, xavfsizlikkami yoki testlargami?

**T3 — Yechimning innovatsionligi**

5. ⭐ PHARMA TRACE'dagi ishonch indeksi ochiq formula bilan hisoblanadi: sertifikat 30 + laboratoriya 30 + taʼminot zanjiri 25 + mutaxassis tasdiqlari 15. Uni ML modelga aylantirish kerakmi yoki tibbiyotda ochiq formula ishonchliroqmi?
6. MEDAI OpenAI va ichki tibbiy kutubxona asosida ishlaydi: javob manbalar bilan beriladi, xavfli soʻrovda 103 ga yoʻnaltiradi. Tasdiqlangan tibbiy hujjatlar bazasi (RAG) qoʻshish qanchalik muhim?

**T4 — Jamoa bilim darajasi**

7. Jamoadan qaysi texnik qarorlarni tushuntirib berishni kutasiz? Masalan, shifrlash, rollar tekshiruvi yoki AI xavfsizligi.

**T5 — Texnologiyalar toʻplami**

8. Bizning stek: Next.js 14, TypeScript, Prisma, PostgreSQL, OpenAI. Masshtablash uchun bu tanlov toʻgʻrimi? Mobil uchun PWA yetarlimi yoki React Native kerakmi?
9. Tibbiy maʼlumotlar AES-256-GCM bilan shifrlanadi, kalit serverda saqlanadi. Kalitlarni boshqarish (KMS) va zaxira nusxa boʻyicha nima tavsiya qilasiz?
10. Dori partiyasi maʼlumotini real tizimdan olish uchun qaysi integratsiya amaliy: "Asl belgisi" markirovka tizimi, davlat dori reestri API yoki ishlab chiqaruvchi API?

---

## 2. Biznes mentor
*Biznes modeli va bozor potensialini baholaydi.*

**B1 — Gʻoya va muammoning dolzarbligi**

1. ⭐ Asosiy yoʻnalishimiz №17 — mahalliy dorilarga ishonch. Uni bemor va shifokor platformasi bilan birga koʻrsatish toʻgʻrimi yoki faqat bitta yoʻnalishga fokus qilish kuchliroqmi?
2. Muammoni qanday raqamlar bilan isbotlash ishonarli boʻladi: soʻrovnoma, statistika yoki kichik pilot natijasi?

**B2 — Biznes modeli / monetizatsiya**

3. ⭐ Bemor uchun platforma bepul. Daromad uch manbadan: klinikalar shifokor paneli uchun obuna toʻlaydi, dorixonalar va mahalliy ishlab chiqaruvchilar esa PHARMA TRACE uchun. Sizningcha, qaysi segment birinchi boʻlib pul toʻlaydi?
4. Mahalliy ishlab chiqaruvchilar sertifikat va laboratoriya natijasini ochiq koʻrsatadigan "ishonch belgisi" uchun pul toʻlashga tayyormi?

**B3 — Raqobatdagi ustunlik**

5. ⭐ AIVITA va boshqa sogʻliq ilovalaridan farqimizni bitta gapda qanday aytsak kuchliroq boʻladi? Bizning variant: *"bemor, shifokor va mahalliy dorilarga ishonch — bitta platformada, 6 tilda"*.
6. Davlat tizimlari (DMED, "Asl belgisi") bilan raqobatlashamizmi yoki ularni toʻldiruvchi boʻlib chiqamizmi?

**B4 — Moliyaviy barqarorlik**

7. Birinchi yil xarajatlari — server, AI API, tibbiy ekspert — va pilot uchun minimal byudjetni qanday hisoblashni tavsiya qilasiz?
8. Bizga qaysi biri mos: grant, investor yoki davlat buyurtmasi?

**B5 — Oʻsish imkoniyati**

9. Platforma 6 tilda ishlaydi (Markaziy Osiyo, rus va ingliz). Birinchi boʻlib qaysi mamlakatga chiqish mantiqli?
10. Pilotni qayerdan boshlagan maʼqul: bitta xususiy klinikadanmi, davlat poliklinikasidanmi yoki dorixonalar tarmogʻidanmi?

---

## 3. Soha mentori (tibbiyot)
*Yoʻnalishga moslik va amaliy qoʻllanilishni baholaydi.*

**S1 — Muammoning dolzarbligi**

1. ⭐ Sizningcha, bemor uchun eng ogʻriqli nuqta qaysi: dorining haqiqiyligiga ishonmaslikmi, tahlil natijasini tushunmaslikmi yoki shifokorga yetib borish qiyinligimi?

**S2 — Sohani tushunish chuqurligi**

2. ⭐ Bizda chekapni ham, koʻrsatkichlarni ham (puls, qand, vazn) shifokor kiritadi, bemor faqat koʻradi. Bu real poliklinika jarayoniga mosmi?
3. Shifokor uchun "Tashxis" va "Xulosa" maydonlari yetarlimi yoki tashxisni XKT-10 (ICD-10) kodi bilan yozish kerakmi?

**S3 — Amaliy qoʻllanilishi**

4. Shifokor bu panelni qabul paytida ishlatishga vaqt topadimi? Qaysi qismini yana soddalashtirish kerak?
5. PHARMA TRACE'dagi sertifikat va laboratoriya natijalarini kim tasdiqlashi kerak: Farmatsevtika tarmogʻini rivojlantirish agentligimi, mustaqil laboratoriyami yoki ishlab chiqaruvchining oʻzimi?

**S4 — Qonunchilikka muvofiqlik**

6. ⭐ "Shaxsga doir maʼlumotlar toʻgʻrisida"gi qonunga (OʻRQ-547) va maʼlumotlarni Oʻzbekiston hududidagi serverda saqlash talabiga qanday moslashishimiz kerak?
7. Shifokor litsenziyasini avtomatik tekshirish uchun qaysi rasmiy reestrdan foydalanish mumkin?
8. ⭐ AI yordamchimiz "tashxis qoʻymaydi va dori buyurmaydi", xavfli holatda 103 ga yoʻnaltiradi. Qonun boʻyicha shu yetarlimi? Yoki bunday dastur tibbiy buyum sifatida roʻyxatdan oʻtishi kerakmi?

**S5 — Taʼsir koʻlami**

9. Loyiha taʼsirini qaysi koʻrsatkich bilan oʻlchash toʻgʻri: aniqlangan soxta dori holatlari soni, qabulga yozilish vaqtining qisqarishi yoki mahalliy dorilar ulushining oʻsishi?
10. Keksalar va qishloq aholisi uchun yana nima qoʻshish kerak: ovozli yordammi, internetsiz rejimmi yoki SMS bildirishnomami?

---

## Mentorlar sizga berishi mumkin boʻlgan savollar va qisqa javoblar

| Savol | Qisqa javob |
|---|---|
| Maʼlumotlaringiz haqiqiymi? | Yoʻq, bu prototip. Dori, sertifikat va shifokor maʼlumotlari hozircha namunaviy. Keyingi bosqichda davlat dori reestri va "Asl belgisi" tizimiga ulanamiz. |
| AI xato qilsa nima boʻladi? | MEDAI tashxis qoʻymaydi va doza aytmaydi. Javob manbalar bilan beriladi, xavfli belgi yozilsa 103 ga yoʻnaltiradi. Chekap va tashxisni faqat shifokor kiritadi. |
| Shifokor boshqa bemorlarning maʼlumotini koʻra oladimi? | Yoʻq. Shifokor faqat oʻziga yozilgan bemorni koʻradi, bemor esa ruxsatni istalgan vaqtda bekor qila oladi. Bu avtomatik test bilan tekshirilgan. |
| Kim pul toʻlaydi? | Bemor uchun bepul. Klinika shifokor paneli uchun obuna toʻlaydi, dorixona va ishlab chiqaruvchi PHARMA TRACE uchun toʻlaydi. |
| Nega aynan mahalliy dorilar? | №17 muammo shu. Sifati tasdiqlangan mahalliy dori ochiq koʻrsatilsa, bemor ishonadi. Masalan, demoda mahalliy muqobil import doridan ~31% arzon. |
| Maʼlumotlar xavfsizmi? | Tibbiy maʼlumotlar AES-256-GCM bilan shifrlanadi, sessiya JWT bilan himoyalangan, maxfiy kalitlar faqat serverda saqlanadi. |
