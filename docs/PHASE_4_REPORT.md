# PHASE 4 hisoboti: Tool registry va Windows asoslari

**Sana:** 2026-11-13
**Holat:** Kod va avtomatik testlar tayyor. Haqiqiy Windows'da qo'lda sinov kutilmoqda.

## Arxitektura (prompt §6.4–6.5, §9, §17, §20)
```
AI (Gemini / Ollama function calling)
  → ToolRegistry: faqat ro'yxatdagi vosita (noma'lumi rad etiladi)
  → zod: argumentlar qat'iy tekshiriladi (ortiqcha maydon ham rad etiladi)
  → ruxsat siyosati: LEVEL 0–1 tasdiqsiz, LEVEL 2+ har safar UI tasdig'i (bir martalik)
  → ConfirmationBroker: tasdiq faqat UI'dagi haqiqiy bosish orqali (120 s, keyin avtomatik rad)
  → OS adapter: faqat qotirilgan PowerShell / explorer buyruqlari
  → natijani tekshirish: dastur oynasi paydo bo'ldimi?
  → AuditRepository (action_audit): har bir amal
  → natija modelga → yakuniy o'zbekcha javob
```

### Vositalar
| Vosita | Daraja | Tasdiq (AI chaqirsa) | Windows'da qanday |
|---|---|---|---|
| `get_system_info` | 0 | yo'q | Node `os` |
| `get_disk_usage` | 0 | yo'q | `fs.statfs` (C:\) |
| `get_battery_status` | 0 | yo'q | `Win32_Battery` (CIM) |
| `list_installed_apps` | 1 | yo'q | `Get-StartApps` (Win32 + UWP, masalan Kalkulyator) |
| `list_open_windows` | 1 | yo'q | `Get-Process` (MainWindowTitle) |
| `launch_app` | 2 | **ha** | `explorer.exe shell:AppsFolder\<AppID>`, faqat ro'yxatdagi AppID |
| `focus_window` | 2 | **ha** | `user32 SetForegroundWindow` (PID faqat butun son) |

Shell, fayl o'chirish yoki administrator huquqi kerak bo'lgan vosita **umuman yo'q** (LEVEL 4 registry'ga kiritilmaydi).

### Xavfsizlik qarorlari
- AI hech qachon shell buyrug'ini yaratmaydi. PowerShell skriptlari kodda qotirilgan, tashqi qiymatdan faqat tekshirilgan PID (butun son) qo'shiladi.
- Dastur faqat Start menyusi ro'yxatidagi AppID bo'yicha ochiladi. Ro'yxatda yo'q yo'l (`C:\…\evil.exe`) rad etiladi. Qo'shtirnoq yoki yangi qatorli AppID ro'yxatdan chiqarib tashlanadi.
- Bir nechta dastur mos kelsa, hech narsa ochilmaydi: AI foydalanuvchidan tanlashni so'raydi (§2).
- Natija tekshiriladi: oyna paydo bo'lmasa "buyruq yuborildi, lekin tekshirib bo'lmadi" deyiladi, "ochildi" deyilmaydi (§6.5).
- Oyna nomlari ishonchsiz tashqi matn deb belgilanadi va tizim ko'rsatmasida bu aytilgan (§20.4).
- Foydalanuvchi Kompyuter sahifasida o'zi bosgan amal qo'shimcha tasdiq so'ramaydi (bosishning o'zi tasdiq), lekin audit qilinadi ("Siz bosgansiz").
- Crash'dan keyin "running" holatidagi amal "unknown" bo'ladi (§21).
- Lokal model function calling'ni qo'llamasa, MARIUS vositalarsiz va "amal bajara olmaysan" ko'rsatmasi bilan qayta uradi.
- Gemini: modelning `functionCall` qismi `thoughtSignature` bilan birga o'zgarmasdan qaytariladi (rasmiy SDK'dan tasdiqlangan talab).

### UI
- **Tasdiq oynasi:** amal, nimaga ta'sir qiladi, natija, xavf darajasi. Standart fokus "Bekor qilish" tugmasida, Esc bosilsa bekor qilinadi, qolgan vaqt ko'rsatiladi.
- **Suhbatdagi amal kartalari:** bajarilmoqda, tasdiq kutilmoqda, bajarildi, tekshirilmadi, bekor qilindi yoki xato. Holat ikonka, matn va rang bilan ko'rsatiladi.
- **Kompyuter sahifasi:** tizim, dasturlar (qidiruv, ochish), ochiq oynalar (o'tish).
- **Tarix sahifasi:** vaqt, amal, kim (MARIUS yoki Siz), daraja, tasdiq, natija, davomiylik, tozalash.

## Testlar
| Tekshiruv | Natija (Linux) |
|---|---|
| typecheck / lint / build | ✅ |
| Unit | ✅ 145. Yangilari: registry (LEVEL 4 va dublikat rad etiladi, JSON Schema), executor (noma'lum vosita, noto'g'ri yoki ortiqcha argument, rad etish → hech narsa ochilmaydi, tasdiq → bir marta, tasdiq bir martalik, timeout, AMBIGUOUS, o'qish tasdiqsiz, foydalanuvchi amali, ro'yxatda yo'q AppID, crash tiklash, Windows bo'lmagan tizim), natijani tekshirish, broker, dastur nomini moslashtirish (o'zbekcha qo'shimchalar, taxalluslar), PowerShell parserlari, PID injection himoyasi, Gemini/Ollama function calling formatlari, chat vosita tsikli (cheksiz tsikl to'xtatiladi) |
| E2E | ✅ 19. Yangilari: "Kalkulyatorni och" → tasdiq oynasi → tasdiqlash → ochildi → Tarix; rad etish → ochilmaydi; Kompyuter sahifasi; Gemini `thoughtSignature` qaytarilishi; haqiqiy OS adapteri (**Windows CI'da haqiqiy `Get-StartApps` va `Get-Process`**) |

## Windows'da qo'lda tekshirish kerak
1. "Kalkulyatorni och", "Chrome brauzerini och", "Qaysi dasturlar ochiq turibdi?" (Gemini bilan).
2. Kompyuter sahifasida dasturlar ro'yxati (o'zbek yoki rus Windows'da nomlar to'g'ri ko'rinadimi?), ochish, oynaga o'tish.
3. Rad etish va 2 daqiqa javob bermaslik: hech narsa ochilmasligi kerak.

## Ma'lum cheklovlar
- Dastur publisher va imzosini tekshirish hali yo'q (§9 "imkoni bo'lsa"). Hozircha faqat Start menyusidagi dasturlar ochiladi.
- `SetForegroundWindow` ni Windows ba'zan bloklaydi (foreground lock). Bunda MARIUS buni ochiq aytadi.
- Ba'zi Ollama modellari function calling'ni qo'llamaydi: bunday modellarda faqat suhbat ishlaydi.
