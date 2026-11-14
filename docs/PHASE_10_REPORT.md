# PHASE 10 hisoboti: Hardening va release (v0.9.0 beta)

**Holat:** Avtomatik qism tayyor. Haqiqiy Windows 10/11'da toza o'rnatish va o'chirishni qo'lda sinash kerak ([`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md)). Bu sinalmaguncha versiya **beta** (0.9.0), 1.0 emas.

## Xavfsizlik
- `npm audit --omit=dev`: **0 zaiflik.** CI'ga majburiy qadam sifatida qo'shildi: zaif paket installer'ga kirsa, build to'xtaydi.
- Dev vositalari: `npm audit fix` (majburlamasdan) 14 tadan 12 taga tushirdi. Qolganlari `minimatch` ichida (eslint, electron-builder). `--force` eski versiyalarga qaytaradi, shuning uchun qabul qilindi va hujjatlashtirildi (R-16). `eslint` 10.15.0 ga yangilandi.
- Prompt injection testlari (PHASE 9) va barcha xavfsizlik testlari regression to'plamida.

## Installer (NSIS, `build/installer.nsh`)
- O'rnatish papkasini tanlash, ish stoli va Start menyusi yorlig'i, administrator talab qilinmaydi (oldindan bor edi).
- **Uninstall tanlovi:** "MARIUS ma'lumotlari ham o'chirilsinmi?"
  - Standart javob "Yo'q"; jim rejimda (`/S`) ham "Yo'q".
  - Yangilashda (`isUpdated`) umuman so'ralmaydi.
  - Faqat `%APPDATA%\MARIUS` o'chiriladi. Obsidian Vault va zaxira fayllarga tegilmaydi.
- Uninstall "Windows bilan ishga tushish" registr yozuvini ham o'chiradi (`Run` va `StartupApproved\Run`), aks holda u yo'q dasturga ishora qilib qolar edi.
- NSIS skripti faqat Windows CI'da kompilyatsiya qilinadi. Dialogning o'zini qo'lda sinash kerak.

## Windows bilan birga ishga tushish
- Sozlamalar → "Windows bilan birga ishga tushish". **Standart holatda o'chiq** (§23).
- `app.setLoginItemSettings` faqat o'rnatilgan Windows ilovasida chaqiriladi, shuning uchun dev rejimida `electron.exe` ro'yxatga olinmaydi.
- Avtomatik ishga tushganda:
  - tray yoqilgan bo'lsa, oyna ko'rsatilmaydi;
  - tray o'chiq bo'lsa, vazifalar panelida kichraytirilgan holda ochiladi.
- MARIUS qayta ochilganda (ikkinchi nusxa) yashirin oyna endi ko'rsatiladi. **Tuzatildi:** avval tray'da yashiringan oyna chiqmas edi.

## Unumdorlik va xotira (Linux, xvfb, soxta AI server bilan o'lchandi)
| O'lchov | Natija |
|---|---|
| Ishga tushish (jarayon → birinchi ekran) | ~0.3 s |
| Main heap (majburiy GC), 0 / 30 / 60 / 90 / 120 xabar | 8.7 / 11.7 / 11.8 / 11.9 / 12.0 MB |
| Renderer heap, 40 xabar va 35 sahifa almashishdan keyin | ~10 MB (o'zgarmadi) |
| Barcha jarayonlar working set | ~500–600 MB (Electron uchun odatiy) |

Birinchi xabarlardagi o'sish modullar va keshlar yuklanishi bilan bog'liq. Keyin har 30 ta xabarga taxminan 0.1 MB, ya'ni **xotira oqishi aniqlanmadi**. Windows'dagi qiymatlar farq qilishi mumkin.

## Hujjatlar
- `README.md`: yakuniy versiya. Barcha imkoniyatlar, o'chirish, maxfiylik va troubleshooting yangilandi.
- `docs/KNOWN_LIMITATIONS.md`: nima ishlamasligi, halol ro'yxat.
- `docs/RELEASE_CHECKLIST.md`: Windows 10/11'da qo'lda tekshirish ro'yxati (A–E).
- `docs/RISK_REGISTER.md`: R-03, R-12, R-14, R-16 yangilandi; R-23 va R-24 qo'shildi.
- Versiya: `0.9.0`.

## Testlar (yakuniy regression)
- Unit: **237**, barchasi o‘tdi.
- E2E: **32**, barchasi o‘tdi. Yangilari:
  - avtomatik ishga tushish, tray va ekran tahlili standart holatda o'chiq;
  - sozlama qayta ishga tushganda saqlanadi;
  - `--marius-autostart` + tray bo'lsa, oyna fonda qoladi.
