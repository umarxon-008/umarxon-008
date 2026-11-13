# MARIUS — Risk registri

Ehtimollik va ta'sir: **Y** — yuqori, **O** — o'rta, **P** — past.

| ID | Risk | Ehtimollik | Ta'sir | Yumshatish choralari | PHASE |
|---|---|---|---|---|---|
| R-01 | Dev muhit Linux bo'lgani uchun Windows API'larini bu yerda real sinab bo'lmaydi | Y | Y | Windows'ga xos kod `src/main/windows` da izolyatsiya qilinadi va interfeys orqali mock qilinadi; GitHub Actions `windows-latest` runner'da build va test; foydalanuvchining kompyuterida qo'lda tekshirish uchun checklist; sinovdan o'tmagan funksiya "passed" deb belgilanmaydi | 1+ |
| R-02 | O'zbek tilidagi STT/TTS sifati past bo'lishi mumkin | Y | Y | Provider adapterlari va o'lchanadigan test to'plami; transkriptni yuborishdan oldin tahrirlash; matnli rejim har doim ishlaydi; sifat haqida asossiz da'vo qilinmaydi | 3 |
| R-03 | Prompt injection (web, fayl, ekran matni) | O | Y | Tashqi kontent `untrusted` belgisi bilan beriladi; tool policy model'dan mustaqil; tasdiq faqat UI orqali; Level 4 tool'lar umuman mavjud emas; injection fixture testlari | 2, 4, 9 |
| R-04 | API kalit sizib chiqishi | O | Y | `safeStorage`/DPAPI; kalit faqat main process'da; log redaction; `.env` gitignore'da; CI'da secret scan | 2 |
| R-05 | Path traversal yoki symlink orqali ruxsatsiz papkaga kirish | O | Y | `realpath` + ruxsat etilgan ildizni tekshirish, reparse point tekshiruvi, maxsus security testlar | 5 |
| R-06 | AI tasodifiy dastur yoki buyruqni ishga tushirishi | O | Y | Shell tool yo'q; faqat ro'yxatdagi app ID'lar; parametrlari qotirilgan adapterlar | 4 |
| R-07 | Imzosiz installer: SmartScreen va antivirus ogohlantirishi | Y | O | MVP'da foydalanuvchiga hujjatlashtiriladi; keyinchalik code signing sertifikati (pullik, foydalanuvchi qarori) | 10 |
| R-08 | ~~Native modul (`better-sqlite3`) Electron bilan build muammolari~~ | — | — | **Yopildi:** `node:sqlite` tanlandi, native modul yo'q | 1 |
| R-09 | Eng yangi tool versiyalari (TS 7, Vite 8, Electron 45) o'zaro mos kelmasligi | P | O | **Yumshatildi:** TS 6.0 qotirildi; lockfile; CI har push'da tekshiradi | 1 |
| R-10 | Pullik API xarajatlari (AI, STT, TTS, YouTube) | O | O | Kalitni foydalanuvchining o'zi kiritadi; so'rov limitlari va timeout; foydalanuvchi tasdig'isiz pullik servisga ulanilmaydi | 2, 3, 6 |
| R-11 | Eslatmalar ilova yopiq bo'lganda chiqmasligi | Y | O | Tray rejimi; cheklov UI va README'da aniq yoziladi; startup sozlamasi ixtiyoriy | 7 |
| R-12 | Ekran tasvirida sezgir ma'lumot | O | Y | Faqat aniq buyruq va rozilik bilan; indikator; doimiy yozib borish yo'q; rasm vaqtinchalik saqlanadi | 8 |
| R-13 | Scope creep: MVP tugamay V2/V3 ga o'tib ketish | O | O | PHASE'lar bo'yicha qat'iy ish; har bir PHASE oxirida foydalanuvchi tasdig'i | — |
| R-14 | Windows toast notification AppUserModelID noto'g'ri bo'lsa, bildirishnoma chiqmaydi | O | P | `app.setAppUserModelId` va NSIS shortcut; o'rnatilgan build'da test | 7, 10 |
| R-15 | Crash paytida yarim bajarilgan amal | P | O | Audit holati `running → unknown`; SQLite WAL; tranzaksiyalar | 4 |
| R-16 | Dependency zaifliklari | O | O | `npm audit` CI'da; minimal dependency siyosati | 10 |
| R-17 | `node:sqlite` Node'da hali "experimental" belgisida | O | O | Foydalanish `database.ts` bilan cheklangan; API o'zgarsa faqat shu fayl yangilanadi; Electron yangilanishida testlar tekshiradi | 1+ |
