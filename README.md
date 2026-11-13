# MARIUS

O‘zbek tilida gaplashadigan shaxsiy AI desktop yordamchi. Windows 10/11 uchun mo‘ljallangan.

> **Holat:** 1-bosqich (PHASE 1): ilova poydevori, xavfsiz arxitektura va interfeys skeleti.
> AI suhbat, ovoz va kompyuter amallari keyingi bosqichlarda qo‘shiladi. Reja: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Windows'da sinab ko‘rish (dasturchi bo‘lmaganlar uchun)

1. GitHub'da repozitoriyning **Actions** bo‘limini oching.
2. Eng oxirgi yashil ✅ **Windows build** ishga tushirishini tanlang.
3. Sahifaning pastidagi **Artifacts** qismidan `MARIUS-Setup-windows` ni yuklab oling (zip).
4. Zip ichidagi `MARIUS-Setup-x.y.z.exe` ni ishga tushiring.
5. Windows **“Windows protected your PC”** deb ogohlantirsa: **More info → Run anyway**.
   Bu dastur hali raqamli imzoga ega emasligi uchun chiqadi (qarang: `docs/RISK_REGISTER.md`, R-07).

Dastur ma’lumotlari `%APPDATA%\MARIUS` papkasida saqlanadi (`marius.db`, `logs\`).
O‘chirish: _Sozlamalar → Ilovalar → MARIUS → Uninstall_. Ma’lumotlar papkasi saqlanib qoladi.

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

| O‘zgaruvchi            | Vazifasi                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `MARIUS_USER_DATA_DIR` | Faqat dev/test: ma’lumotlar papkasini almashtiradi. Paketlangan ilovada e’tiborga olinmaydi |

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
