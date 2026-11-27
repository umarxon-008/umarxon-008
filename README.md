# MARIUS

O‘zbek tilida gaplashadigan shaxsiy AI desktop yordamchi. Windows 10/11 uchun mo‘ljallangan.

> **Holat: v0.9.0 beta.** Rejadagi barcha bosqichlar (PHASE 0–10) yozildi va avtomatik testlardan o‘tdi.
> Haqiqiy Windows 10/11 kompyuterida qo‘lda tekshirish kerak: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).
> Nima ishlamasligi haqida: [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

**Imkoniyatlar:**

- o‘zbekcha AI suhbat (Gemini yoki lokal Ollama);
- ovozli savol-javob va ovozga javob beruvchi shar;
- dastur ochish va oynalar;
- jarayonlar: CPU va RAM, dasturni yopish (Task Manager kabi);
- ruxsatli papkalarda fayllar;
- brauzer va YouTube;
- eslatmalar va xotira;
- Obsidian;
- ekran tahlili;
- media tugmalari;
- zaxira nusxa.

Har bir tashqi amal tasdiq bilan bajariladi va “Tarix”ga yoziladi.

## Tizim talablari

|                       | Minimal                | Tavsiya                    |
| --------------------- | ---------------------- | -------------------------- |
| Windows               | 10 yoki 11, **64-bit** | 11, 64-bit                 |
| Operativ xotira (RAM) | 4 GB                   | 8 GB (Ollama uchun 16 GB+) |
| Disk                  | 1 GB bo‘sh joy         | SSD                        |
| Internet              | Gemini uchun kerak     | —                          |

**32-bit Windows qo‘llab-quvvatlanmaydi:** Electron 45 32-bit versiyada chiqarilmaydi. Tekshirish: _Sozlamalar → Tizim → Haqida → Tizim turi_. U yerda “32-bit operatsion tizim, x64 protsessor” deb yozilgan bo‘lsa, kompyuterga 64-bit Windows o‘rnatish mumkin. 2 GB RAM bilan esa 64-bit Windows ham MARIUS’ni juda sekin ishlatadi.

## Windows'da sinab ko‘rish (dasturchi bo‘lmaganlar uchun)

1. GitHub'da repozitoriyning **Actions** bo‘limini oching.
2. Eng oxirgi yashil ✅ **Windows build** ishga tushirishini tanlang.
3. Sahifaning pastidagi **Artifacts** qismidan `MARIUS-Setup-windows` ni yuklab oling (zip).
4. Zip ichidagi `MARIUS-Setup-x.y.z.exe` ni ishga tushiring.
5. Windows **“Windows protected your PC”** deb ogohlantirsa: **More info → Run anyway**.
   Bu dastur hali raqamli imzoga ega emasligi uchun chiqadi (qarang: `docs/RISK_REGISTER.md`, R-07).

Dastur ma’lumotlari `%APPDATA%\MARIUS` papkasida saqlanadi (`marius.db`, `logs\`).

**O‘chirish:** _Sozlamalar → Ilovalar → MARIUS → Uninstall_.

- O‘chirishda “MARIUS ma’lumotlari ham o‘chirilsinmi?” deb so‘raladi. Standart javob “Yo‘q”.
- “Yo‘q” tanlansa, qayta o‘rnatganda hammasi tiklanadi.
- Yangi versiyani ustidan o‘rnatganda ma’lumotlar hech qachon o‘chirilmaydi.

## AI’ni ulash (bepul)

Sozlamalar → **Sun’iy intellekt** bo‘limida ikkitadan birini tanlang:

**Google Gemini** (internet orqali, o‘zbek tilini yaxshi tushunadi)

1. [Google AI Studio](https://aistudio.google.com/apikey) sahifasida Google akkaunt bilan kiring va **Create API key** tugmasini bosing.
2. Kalitni MARIUS’dagi maydonga qo‘ying va **Saqlash**ni bosing. Kalit Windows himoyasi (DPAPI) bilan shifrlanadi.
3. Ro‘yxatdan modelni tanlang.

> Gemini ishlatilganda yozgan xabarlaringiz Google serverlariga yuboriladi.

**Ollama** (kompyuterning o‘zida, internetsiz)

1. [ollama.com](https://ollama.com/download) saytidan Windows uchun o‘rnating.
2. Buyruqlar oynasida model yuklang: `ollama pull <model-nomi>`.
3. MARIUS’da **Ulanishni tekshirish**ni bosing va modelni tanlang.

> Kuchli kompyuter (16 GB+ RAM) tavsiya etiladi. O‘zbek tili sifati modelga bog‘liq.

## Ovoz bilan ishlash

1. Sozlamalar → **Ovoz**: “Gemini (internet)” va **rozilik** belgisini yoqing (ovoz matnga aylantirish uchun Google’ga yuboriladi).
2. Bosh sahifada mikrofon tugmasini bosing, gapiring va yana bosing. Matnni tekshirib, **Yuborish**ni bosing.
3. Javob ovoz chiqarib o‘qiladi (Windows ovozi yoki Gemini ovozi). Pauza va to‘xtatish tugmalari bor.

Yozuv kompyuterda saqlanmaydi. Mikrofon faqat tugma bosilganda yoqiladi va 30 soniyada o‘zi o‘chadi.

## Tezkor buyruqlar (AI’siz, bir zumda)

Quyidagi aniq buyruqlar AI’ga yuborilmaydi va 1–2 soniyada bajariladi:

- “Telegramni och”, “Kalkulyatorni och”, “Chrome’ni ochib ber”. Tasdiq so‘ralmaydi, chunki buni o‘zingiz aniq aytdingiz.
- “Telegramni yop”. Tasdiq bilan.
- “Ovozni pasaytir/balandlat/o‘chir”, “Pauza”, “Keyingi qo‘shiq”, “Oldingi qo‘shiq”.
- “Batareya”, “Diskda qancha joy bor?”

Dastur nomi aniq topilmasa yoki buyruq murakkab bo‘lsa, so‘rov odatdagidek AI’ga yuboriladi. O‘chirish: Sozlamalar → “Tezkor buyruqlar”.

## Kompyuter amallari

MARIUS’ga “Kalkulyatorni och”, “Qaysi dasturlar ochiq?”, “Diskda qancha joy bor?” deb yozing yoki ayting.
Dastur ochish yoki oynaga o‘tishdan oldin MARIUS **har safar ruxsat so‘raydi**. Barcha amallar **Tarix** bo‘limida ko‘rinadi.
**Jarayonlar (Task Manager kabi):** Kompyuter → Jarayonlar bo‘limida qaysi dastur qancha CPU va RAM ishlatayotgani ko‘rinadi (har 10 soniyada yangilanadi). Chatda “Qaysi dastur ko‘p RAM yeyapti?” yoki “Chrome’ni yop” deb so‘rash mumkin.

- Yopishdan oldin **har safar tasdiq** so‘raladi.
- Standart usul X tugmasini bosish kabi ishlaydi: saqlanmagan ish bo‘lsa, dastur o‘zi so‘raydi.
- “Majburan yopish” faqat oddiy usul ishlamasa taklif qilinadi va saqlanmagan ish yo‘qolishi haqida ogohlantiradi.
- Tizim jarayonlari (svchost, explorer va boshqalar) va MARIUS’ning o‘zi hech qachon yopilmaydi.

Fayl o‘chirish, buyruqlar oynasida buyruq bajarish va administrator amallari yo‘q.

## Fayllar, internet, eslatmalar

- **Fayllar** (Kompyuter → Fayllar): avval papkaga ruxsat bering (masalan, Hujjatlar). Keyin “Yuklamalarda PDF top”, “Hisobot.docx ni och” deb so‘rash mumkin. O‘chirish va ustiga yozish yo‘q. Fayl mazmuni AI’ga yuborilmaydi.
- **Internet:** “Internetda Python darslarini qidir”. Qidiruv brauzeringizda ochiladi. YouTube natijalari uchun Sozlamalar → Internet bo‘limiga YouTube Data API kalitini kiriting (ixtiyoriy).
- **Eslatmalar:** “Ertaga soat 8 da imtihonni eslat”. Noaniq vaqt bo‘lsa, aniq sana bilan tasdiq so‘raladi. MARIUS yopiq bo‘lsa ham eslatma ishlashi uchun Sozlamalarda “Yopilganda tray’da qolish” va “Windows bilan birga ishga tushish”ni yoqing (ikkalasi ham standart holatda o‘chiq).
- **Xotira:** “Eslab qol: men C++ o‘rganyapman”. Parol yoki karta raqami saqlanmaydi. Hammasini Xotira sahifasida ko‘rish va o‘chirish mumkin.

## Obsidian (ixtiyoriy)

Sozlamalar → **Integratsiyalar → Obsidian** → “Mavjud Vault’ni tanlash”. Standart holatda faqat o‘qish yoqiladi. “Yangi note yaratish” va “oxiriga qo‘shish”ni alohida yoqasiz. Har bir yozishdan oldin matn ko‘rsatiladi va tasdiq so‘raladi. Obsidian o‘rnatilmagan bo‘lsa ham MARIUS to‘liq ishlaydi.

## Ekran tahlili va media

- **Ekran tahlili** (standart holatda o‘chiq): Sozlamalar → Maxfiylik → “Ekran tahliliga ruxsat”. So‘ng chatda “ekranimdagi xato nima?” deb yozing yoki Kompyuter → “Ekranni tahlil qilish” tugmasini bosing.
  - Har bir rasm oldidan tasdiq so‘raladi va rasm qayerga ketishi aytiladi: Google Gemini yoki lokal Ollama.
  - Rasm saqlanmaydi.
  - Bank yoki parol oynasi ochiq bo‘lsa, ogohlantirish chiqadi.
- **Media:** “Ovozni pasaytir”, “Keyingi qo‘shiq”, “Pauza”. Kompyuter → Ovoz va media bo‘limidagi tugmalar bilan ham boshqarish mumkin.

## Ma’lumotlar va maxfiylik

- Hamma narsa shu kompyuterda saqlanadi. Bulutga avtomatik yuklash yo‘q.
- Internetga faqat siz tanlagan AI xizmati (Gemini) va siz rozilik bergan ovoz yoki ekran so‘rovlari chiqadi.
- **Zaxira nusxa:** Sozlamalar → Maxfiylik → “Zaxira nusxa olish”. API kalitlari zaxiraga kirmaydi.
- Loglarda API kalit va xabar matnlari yozilmaydi.

## Dasturchilar uchun

### Talablar

- Node.js **22.12+**
- npm 10+
- Git

### O‘rnatish va ishga tushirish

```bash
npm install
npm run dev          # ishlab chiqish rejimi (hot reload)
```

### Tekshiruvlar

```bash
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm test             # unit testlar (Vitest)
npm run build        # production build → out/
npm run test:e2e     # E2E: haqiqiy Electron oynasi (avval npm run build)
npm run check        # typecheck + lint + test + build
```

Linux'da E2E uchun virtual ekran kerak: `xvfb-run -a npm run test:e2e`.

### Installer

```bash
npm run package:win  # dist/MARIUS-Setup-x.y.z.exe (Windows'da ishga tushiring)
```

Har bir push'da GitHub Actions (`.github/workflows/windows-build.yml`) Windows'da barcha tekshiruvlarni bajaradi va installer yasaydi.

### Environment variables

Oddiy foydalanish uchun kerak emas. API kalitlar `.env` faylida emas, ilova ichida shifrlangan holda saqlanadi. Quyidagilar faqat dev va test uchun.

| O‘zgaruvchi               | Vazifasi                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `MARIUS_USER_DATA_DIR`    | Faqat dev/test: ma’lumotlar papkasini almashtiradi. Paketlangan ilovada e’tiborga olinmaydi                           |
| `MARIUS_FAKE_OS`          | Faqat dev/test: `1` bo‘lsa haqiqiy dasturlar o‘rniga soxta OS adapteri (E2E). Paketlangan ilovada e’tiborga olinmaydi |
| `MARIUS_YOUTUBE_BASE_URL` | Faqat dev/test: YouTube API o‘rniga soxta server (E2E)                                                                |
| `MARIUS_GEMINI_BASE_URL`  | Faqat dev/test: Gemini API o‘rniga soxta server (E2E). Paketlangan ilovada e’tiborga olinmaydi                        |

### Tuzilma

```
src/main       Main process: oyna, xavfsizlik, IPC, ma'lumotlar bazasi, log,
               vositalar (tools), fayllar, xotira/eslatmalar, Obsidian, vision, Windows adapteri
src/preload    Renderer'ga ochilgan yagona API (window.marius)
src/renderer   React interfeys (OS'ga to'g'ridan-to'g'ri kirish yo'q)
src/shared     IPC shartnomasi, zod sxemalari, o'zbekcha vaqt parseri
src/modules/ai Gemini, Ollama, ovoz, vision, YouTube adapterlari
build/         ikona va NSIS qo'shimchasi (installer.nsh)
tests/         unit va E2E testlar
docs/          arxitektura, reja, risklar
```

### Muammolar (troubleshooting)

| Muammo                                  | Yechim                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm install` da Electron yuklanmayapti | Internet yoki proxy'ni tekshiring, `npm install` ni qayta ishga tushiring                                          |
| Ilova ochilmayapti                      | `%APPDATA%\MARIUS\logs\marius.log` faylini tekshiring                                                              |
| SmartScreen ogohlantirishi              | **More info → Run anyway** (imzosiz build)                                                                         |
| Oq ekran                                | Sozlamalar buzilgan bo‘lishi mumkin: ilovani yoping va `%APPDATA%\MARIUS\marius.db` ni zaxira nusxa olib o‘chiring |

## Repozitoriydagi boshqa loyiha: EnergyComp

[`energycomp/`](energycomp/) papkasida mustaqil **EnergyComp** loyihasi joylashgan — sanoat korxonalari uchun
energiya boshqaruvi platformasi (Next.js + PostgreSQL, MVP). U MARIUS bilan kod va paketlarni bo‘lishmaydi,
o‘z CI’siga ega (`.github/workflows/energycomp-ci.yml`). Ishga tushirish: [`energycomp/README.md`](energycomp/README.md).
