# Prompt: NeuraMed'ni sodda va keksalarga qulay koʻrinishga keltirish

> Ushbu matnni toʻliq nusxalab, yangi AI suhbatiga (Claude Code va boshqalar) yuboring.
> Loyiha: `NeuraMed/` papkasi (Next.js 14, TypeScript, Tailwind). Git branch: `claude/malumot-berish-ve8nog`.

---

## Vazifa

NeuraMed loyihasining **dizaynini soddalashtir**, toki uni **yoshi katta odam** ham birinchi qarashda tushunsin.
**Hech bir funksiyani olib tashlama** — barcha sahifalar, bemor va shifokor rollari, PHARMA TRACE (hakaton muammosi №17), 6 til, SOS, bildirishnomalar va testlar ishlashda davom etishi shart. Faqat koʻrinish, yozuv oʻlchami, ranglar va sahifa tuzilishi oʻzgaradi.

Javob va izohlarni **oʻzbek tilida (lotin)** yoz.

Ishni ikki bosqichda bajar. **1-bosqich** muhimroq — avval uni oxirigacha yetkazib, commit qil, keyin 2-bosqichga oʻt.

---

## 1-BOSQICH (asosiy, ≈1 soat): ranglar, yozuv, tugmalar

### 1.1 Ranglarni kamaytir
Hozir koʻp joyda yashil→feruza→binafsha gradient va har xil rangli ikonkalar ishlatilgan. Ularni **bitta asosiy rang** bilan almashtir.

- Asosiy rang: **toʻq yashil-feruza `#0E7C5A`** (allaqachon `--primary`). Binafsha (`#6D28D9`, `violet-*`, `purple-*`) faqat logotipda qolsin.
- Rang maʼnosi qatʼiy boʻlsin:
  - **qizil** — faqat xavf, SOS, "shubhali";
  - **sariq/amber** — faqat "eʼtibor bering" va DEMO;
  - **yashil** — faqat "meʼyorda / tasdiqlangan";
  - qolgan hamma narsa — oq/och kulrang fon, toʻq matn, asosiy rang.
- Gradient klasslarini tekis rangga almashtir:
  - `tailwind.config.*` → `backgroundImage` ichidagi `gradient-primary`, `gradient-brand-deep`, `gradient-emerald`, `gradient-violet`. Ularni oʻchirma — qiymatini tekis rangga oʻzgartir. Masalan, `gradient-primary` → `linear-gradient(#0E7C5A,#0E7C5A)`, `gradient-brand-deep` → `linear-gradient(#0B3B4A,#0B3B4A)`. Shunda 16 ta fayldagi `bg-gradient-primary` va boshqa klasslar avtomatik soddalashadi.
  - `src/app/globals.css` → `.gradient-text` (logotip yozuvi) oddiy `text-primary-700` boʻlsin.
  - `src/components/ui/button.tsx` → `gradient` varianti tekis asosiy rang boʻlsin (`bg-primary-600 hover:bg-primary-700`).
- `src/components/modules/common.tsx` → `ModuleHero`:
  - fondagi dekorativ nurlanish doiralarini (`blur-2xl` doiralar) olib tashla;
  - foni och rang boʻlsin (`bg-white` yoki `bg-primary-50`), matni toʻq rang.
- `Kpi`, `platform-overview.tsx` va boshqa joylardagi har xil rangli ikonka fonlari (`violet`, `sky`, `cyan` va h.k.) → bitta `bg-primary-50 text-primary-700`. Holat ranglari (qizil/sariq/yashil) bundan mustasno.
- **Tungi rejim** ham ishlashi kerak: har bir oʻzgartirilgan joyda `dark:` variantini tekshir.

### 1.2 Yozuvni kattalashtir va kontrastni oshir
- Asosiy matn hozir taxminan 14 px → **17–18 px** boʻlsin.
  - Eng oson yoʻl: `globals.css` → `html { font-size: 112.5%; }`. Bunda barcha `rem` oʻlchamlar ~12% kattalashadi.
  - Shundan keyin sahifalar sigʻishini tekshir (ayniqsa telefon 390 px va yon menyu 288 px).
- Juda mayda yozuvlar (`text-[10px]`, `text-[11px]`, `text-xs`) muhim matnda ishlatilmasin: kamida `text-sm`. Faqat sanalar va ikkinchi darajali izohlar `text-xs` qolishi mumkin.
- Och kulrang matnlarni (`text-slate-400`) oʻqiladigan matnda `text-slate-600` ga, tungi rejimda esa `dark:text-slate-300` ga almashtir. Kontrast WCAG AA (4.5:1) dan past boʻlmasin.

### 1.3 "Yozuv oʻlchami" sozlamasi
- `src/app/(main)/settings/page.tsx` ga yangi karta qoʻsh: **"Yozuv oʻlchami: Oddiy / Katta / Juda katta"** (100% / 112.5% / 125%).
- Tanlov `localStorage` (`neuramed_font_scale`) va cookie'da saqlansin. U `document.documentElement.style.fontSize` ga qoʻllanadi.
- Sahifa ochilganda miltillamasligi uchun `src/app/layout.tsx` da kichik inline skript bilan oldindan qoʻllash mumkin.
- Standart qiymat: **Katta (112.5%)**.

### 1.4 Tugmalar va menyu
- Barcha bosiladigan elementlar kamida **44–48 px** balandlikda boʻlsin: tugmalar, menyu punktlari, yorliqlar (`src/components/modules/tabs.tsx`), chiplar.
- Header (`src/components/layout/app-header.tsx`) dagi faqat ikonkadan iborat tugmalar yoniga yozuv qoʻsh (kompyuterda koʻrinsin, telefonda ikonka yetarli):
  - 🔔 → "Xabarlar";
  - 🌙/☀️ → "Rejim".
- Yon menyu (`src/components/layout/side-nav.tsx`, `nav-items.ts`) punktlariga qisqa izoh qoʻsh, masalan:
  - "PHARMA TRACE" + "Dorini tekshirish";
  - "MEDCONNECT" + "Shifokorga yozilish";
  - "MEDAI" + "Savol bering".

  Buning uchun `NavItem` ga ixtiyoriy `hint` maydoni qoʻshib, uni kichik ikkinchi qatorda koʻrsat.

### 1.5 Tekshiruv va commit (1-bosqich oxiri)
1. `cd NeuraMed && npx tsc --noEmit -p .`
2. `npm run test:unit` — hammasi oʻtishi kerak. **Yangi `t("...")` matn qoʻshsang, uni 5 ta lugʻatga yoz:** `src/i18n/messages/{ru,en,kk,ky,tg}.ts`. Test tarjimasi yoʻq matnni koʻrsatadi.
3. `npx playwright test --trace off` — 17 ta E2E test. Agar test tugma nomi yoki matn oʻzgargani uchun yiqilsa, testni yangi matnga moslashtir. Funksiyani buzma.
4. `npx next build` — xatosiz chiqishi kerak.
5. Brauzerda bemor (`test@neuramed.uz`) va shifokor (`doctor@neuramed.uz`) hisobi bilan koʻr. Ikkalasining paroli `Test12345!`. Yorugʻ va tungi rejimda, telefon (390 px) va kompyuter (1440 px) oʻlchamida tekshir.
6. Commit va push: `git push -u origin claude/malumot-berish-ve8nog`.

---

## 2-BOSQICH (qoʻshimcha, ≈1–2 soat): sahifalarni soddalashtirish

### 2.1 Bemorning bosh sahifasi — `src/app/(main)/dashboard/dashboard-client.tsx`
Hozir sahifada salomlashish, ogohlantirish, 4 ta "Salomatligim" kartasi, 3 ta modul kartasi, 2 ta ogohlantirish, 4 ta tez tugma, keyingi eslatma, faol eslatmalar va soʻnggi tahlillar bor. Bu juda koʻp.

Yangi tartib:
1. Salomlashish: "Xayrli kun, Aziza".
2. **"Bugun"** bloki, yirik yozuvda:
   - keyingi dori (nomi, vaqti, "Ichdim" tugmasi);
   - keyingi qabul (shifokor, sana va vaqt);
   - agar boʻlsa, bitta eng muhim ogohlantirish (masalan, shubhali partiya).
3. **6 ta katta tugma** (2×3 panjara, ikonka va bitta soʻz): Dorilar · Tahlillar · Chekap · Shifokor · Savol berish (MEDAI) · Dorini tekshirish (PHARMA TRACE).
4. Qolgan bloklarni (modullar, faol eslatmalar, soʻnggi tahlillar) **"Batafsil"** ochiladigan qismiga yoki tegishli sahifalarga koʻchir. Ular yoʻqolmasin.

### 2.2 DEMO belgilari
- Har bir kartada takrorlanadigan "Demo" yorliqlarini olib tashla. Oʻrniga har sahifaning tepasida **bitta** ixcham qator boʻlsin: "Namunaviy maʼlumotlar".
- **Muhim:** namunaviy maʼlumot baribir har doim belgilangan boʻlishi shart (tibbiy xavfsizlik qoidasi). Masalan, "(namuna)" qoʻshimchalari qoladi.

### 2.3 Matnlarni qisqartir
- `ModuleHero` dagi uzun tushuntirishlarni bitta qisqa gapga qisqartir.
- Atamalarni oddiy soʻz bilan izohla: "Chekap" → "Chekap (salomatlik tekshiruvi)"; "Koʻrsatkichlar" → "Koʻrsatkichlar (puls, qand, vazn)".
- Har bir oʻzgargan matnni 5 ta lugʻatda ham yangila (eski kalitni yangi kalitga almashtir).

### 2.4 Shifokor paneli
- Shifokor uchun ham xuddi shu qoidalar amal qiladi: kam rang va katta yozuv.
- `src/app/(main)/doctor/doctor-home.tsx` da birinchi blok **"Bugungi qabullar"** boʻlsin (eng muhimi).

### 2.5 Yakun
- 1.5-banddagi tekshiruvlarni takrorla.
- Taqdimot uchun yangi skrinshotlar ol (masalan, Playwright bilan, 1576×1000 oʻlcham va `deviceScaleFactor: 1.5`).
- Commit va push.

---

## Qatʼiy qoidalar (buzma)
- **Funksiya olib tashlanmaydi.** Agar biror narsani sahifadan olsang, u boshqa joyda (ochiladigan qism yoki tegishli sahifada) qolishi shart.
- **Tibbiy xavfsizlik:**
  - tashxis yoki dori dozasi taklif qilinmaydi;
  - xavfli holatda 103/112 ogohlantirishi qoladi;
  - SOS tugmasi doim qizil va koʻzga tashlanadigan boʻladi.
- Rol himoyasiga tegma: `src/middleware.ts`, `requirePatient` / `requireDoctor`, `assertPatientAccess`.
- `.env.local` va maxfiy kalitlarni commit qilma. `storage/*.json` lokal baza ham commit qilinmaydi.
- Barcha yangi matnlar 6 tilda boʻladi: oʻzbek manba matn + ru, en, kk, ky, tg.
- Commit xabarlarida AI model nomini yozma.

## Foydali maʼlumot
- **Ishga tushirish:** `cd NeuraMed && npm install && npm run dev` → http://localhost:3000. Testlar 3100-portdan foydalanadi.
- **Asosiy dizayn fayllari:**
  - `tailwind.config.*` (ranglar, gradientlar);
  - `src/app/globals.css` (`.card-base`, `.btn-*`, `.gradient-text`, `.input-base`);
  - `src/components/ui/button.tsx`;
  - `src/components/modules/common.tsx` (`ModuleHero`, `Kpi`, `DemoNote`, `Chip`, `Modal`);
  - `src/components/modules/tabs.tsx`;
  - `src/components/layout/*` (header, footer, yon va pastki menyu).
- **Tarjima tizimi:** kalit — oʻzbekcha matnning oʻzi. `t("Matn")` → `src/i18n/messages/*.ts`.
