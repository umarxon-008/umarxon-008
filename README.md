# MARIUS

O‘zbek tilida gaplashadigan shaxsiy AI desktop yordamchi. Windows 10/11 uchun mo‘ljallangan.

> **Holat:** 4-bosqich (PHASE 4): o‘zbekcha AI suhbat (Gemini yoki lokal Ollama), ovozli savol-javob, real tizim monitoringi, ovozga javob beruvchi shar.
> Dastur ochish va oynalar bilan ishlash (tasdiq va audit bilan) mavjud. Fayllar, eslatmalar va brauzer qidiruvi keyingi bosqichlarda. Reja: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Windows'da sinab ko‘rish (dasturchi bo‘lmaganlar uchun)

1. GitHub'da repozitoriyning **Actions** bo‘limini oching.
2. Eng oxirgi yashil ✅ **Windows build** ishga tushirishini tanlang.
3. Sahifaning pastidagi **Artifacts** qismidan `MARIUS-Setup-windows` ni yuklab oling (zip).
4. Zip ichidagi `MARIUS-Setup-x.y.z.exe` ni ishga tushiring.
5. Windows **“Windows protected your PC”** deb ogohlantirsa: **More info → Run anyway**.
   Bu dastur hali raqamli imzoga ega emasligi uchun chiqadi (qarang: `docs/RISK_REGISTER.md`, R-07).

Dastur ma’lumotlari `%APPDATA%\MARIUS` papkasida saqlanadi (`marius.db`, `logs\`).
O‘chirish: _Sozlamalar → Ilovalar → MARIUS → Uninstall_. Ma’lumotlar papkasi saqlanib qoladi.

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

## Kompyuter amallari

MARIUS’ga “Kalkulyatorni och”, “Qaysi dasturlar ochiq?”, “Diskda qancha joy bor?” deb yozing yoki ayting.
Dastur ochish yoki oynaga o‘tishdan oldin MARIUS **har safar ruxsat so‘raydi**. Barcha amallar **Tarix** bo‘limida ko‘rinadi.
Fayl o‘chirish, buyruqlar oynasida buyruq bajarish va administrator amallari yo‘q.

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

Hozircha kerak emas. API kalitlar `.env` faylida emas, ilova ichida shifrlangan holda saqlanadi (2-bosqich).

| O‘zgaruvchi               | Vazifasi                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `MARIUS_USER_DATA_DIR`    | Faqat dev/test: ma’lumotlar papkasini almashtiradi. Paketlangan ilovada e’tiborga olinmaydi                           |
| `MARIUS_FAKE_OS`          | Faqat dev/test: `1` bo‘lsa haqiqiy dasturlar o‘rniga soxta OS adapteri (E2E). Paketlangan ilovada e’tiborga olinmaydi |
| `MARIUS_YOUTUBE_BASE_URL` | Faqat dev/test: YouTube API o‘rniga soxta server (E2E)                                                                |
| `MARIUS_GEMINI_BASE_URL`  | Faqat dev/test: Gemini API o‘rniga soxta server (E2E). Paketlangan ilovada e’tiborga olinmaydi                        |

### Tuzilma

```
src/main       Main process: oyna, xavfsizlik, IPC, ma'lumotlar bazasi, log
src/preload    Renderer'ga ochilgan yagona API (window.marius)
src/renderer   React interfeys (OS'ga to'g'ridan-to'g'ri kirish yo'q)
src/shared     IPC shartnomasi va zod sxemalari
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
