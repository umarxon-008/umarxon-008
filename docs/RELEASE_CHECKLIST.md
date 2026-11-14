# MARIUS: release checklist

Har bir release oldidan. Belgilash: ✅ o'tdi · ❌ xato (issue oching) · ⏭ tekshirilmadi (sababi bilan).

## A. Avtomatik (CI: `.github/workflows/windows-build.yml`)
- [ ] `npm audit --omit=dev` toza
- [ ] Typecheck, lint, unit testlar
- [ ] Build va E2E (Windows runner)
- [ ] Installer yasaldi (`MARIUS-Setup-windows` artifact)
- [ ] `package.json` versiyasi yangilandi, `docs/KNOWN_LIMITATIONS.md` dolzarb

## B. O'rnatish (Windows 10 **va** Windows 11, oddiy foydalanuvchi akkaunti)
- [ ] SmartScreen → *More info → Run anyway* bilan ochiladi
- [ ] O'rnatish papkasini tanlash ishlaydi, administrator so'ralmaydi
- [ ] Ish stoli va Start menyusida "MARIUS" yorlig'i bor
- [ ] Birinchi ochilishda tanishuv oynasi chiqadi, "Tizim faol" ko'rinadi
- [ ] CPU, RAM, disk va batareya real qiymatlarni ko'rsatadi

## C. Funksiyalar
- [ ] **Gemini:** kalit saqlanadi, model tanlanadi, o'zbekcha javob oqim bilan keladi
- [ ] **Ollama:** ulanish tekshiriladi va javob keladi (o'rnatilgan bo'lsa)
- [ ] **Ovoz:** rozilik → mikrofon → transkript → javob → ovoz chiqarib o'qish. Shar ovozga qarab harakatlanadi
- [ ] "Kalkulyatorni och": tasdiq oynasi chiqadi, dastur ochiladi, "Tarix"da ko'rinadi
- [ ] **Fayllar:** papka qo'shish, qidirish, ochish; `.exe` ochilmaydi
- [ ] **Internet:** brauzer qidiruvi; YouTube (kalit bilan va kalitsiz)
- [ ] **Eslatma:** "2 daqiqadan keyin eslat" → Windows bildirishnomasi chiqadi (oyna tray'da yopiq holatda ham)
- [ ] **Xotira:** qo'shish, karta raqami rad etilishi, eksport
- [ ] **Obsidian:** Vault tanlash, qidiruv, ruxsat bilan note yaratish (Obsidian'da ko'rinadi)
- [ ] **Ekran tahlili:** standart o'chiq; yoqilgach tasdiq, MARIUS yashirinadi, javob keladi; bank sahifasi ochiq bo'lsa ogohlantirish chiqadi
- [ ] **Jarayonlar:** Kompyuter → Jarayonlar real dasturlarni CPU va RAM bilan ko'rsatadi; Task Manager bilan taxminan mos
- [ ] Bloknot'da saqlanmagan matn bilan "Yopish" → tasdiq → Bloknot "Saqlansinmi?" deb so'raydi (ma'lumot yo'qolmaydi)
- [ ] svchost va explorer qatorlarida "Yopish" tugmasi yo'q; chatda "explorer'ni yop" deb so'ralsa rad etiladi
- [ ] **Media:** ovoz −/+, pauza, keyingi trek
- [ ] **Zaxira:** nusxa olish, tiklash, qayta ishga tushirish, ma'lumot qaytgani; API kaliti saqlangani
- [ ] **Windows bilan ishga tushish:** yoqing, kompyuterni qayta yoqing, MARIUS ochiladi (tray yoqilgan bo'lsa, fonda)

## D. Yangilash va o'chirish
- [ ] Eski versiya ustiga yangisini o'rnatish: ma'lumot o'chirish so'ralmaydi, suhbatlar va kalitlar saqlanadi
- [ ] O'chirish → "Yo'q": `%APPDATA%\MARIUS` qoladi; qayta o'rnatilganda ma'lumot tiklanadi
- [ ] O'chirish → "Ha": `%APPDATA%\MARIUS` o'chadi, Obsidian Vault va zaxira fayllarga tegilmaydi
- [ ] O'chirishdan keyin "Windows bilan ishga tushish" yozuvi qolmagan (Task Manager → Startup)

## E. Xavfsizlik va maxfiylik
- [ ] `marius.log` ichida API kalit, xabar matni yoki fayl mazmuni yo'q
- [ ] DevTools paketlangan ilovada ochilmaydi
- [ ] Tasdiqsiz hech qanday tashqi amal bajarilmaydi (rad etilganda "Tarix"da "Rad etildi" ko'rinadi)
