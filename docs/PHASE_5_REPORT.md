# PHASE 5 hisoboti: Fayl menejeri

**Holat:** Kod va avtomatik testlar tayyor. Windows'da qo'lda sinov kutilmoqda.

## Qilingan ishlar
- **Ruxsatli papkalar** (prompt §10.1), migratsiya v4: foydalanuvchi standart papkalardan (Hujjatlar, Yuklamalar, Ish stoli, Rasmlar, Musiqa, Videolar) yoki tizim dialogi orqali qo'shadi. Butun disk yoki butun profilni qo'shib bo'lmaydi. Papkalar ro'yxati va ularni olib tashlash UI'da ko'rinadi.
- **Path guard** (§10.4): `realpath` bilan symlink va junction ochiladi; `..`, nisbiy yo'l, UNC/qurilma yo'llari (`\\server`, `\\?\`), `C:foo` va null bayt rad etiladi; o'xshash nomli qo'shni papka (`Docs2`) ichida hisoblanmaydi.
- **Qidiruv** (§10.2): nom (o'zbekcha apostroflar va `_`/`-` farqisiz), kengaytma, sana, papka bo'yicha; symlink'larga kirilmaydi; chuqurlik va skanerlash soni cheklangan; main bloklanmaydi; bekor qilish mumkin.
- **Vositalar** (§10.3):

| Vosita | Daraja | Tasdiq |
|---|---|---|
| `list_allowed_folders`, `search_files`, `show_in_folder` | 1 | yo'q |
| `open_file`, `create_folder`, `copy_file` | 2 | ha |
| `move_file`, `rename_file` | 3 | ha |

- **Hech qachon ustidan yozilmaydi** (`COPYFILE_EXCL`, oldindan tekshiruv). **O'chirish yo'q.** Boshqa diskka ko'chirishda avval nusxa olinadi va hajmi tekshiriladi.
- **Dastur va skript fayllari** (`.exe`, `.bat`, `.ps1`, `.lnk`, `.js`, `.msi`…) "ochish" orqali bajarilmaydi. Faylni shunday kengaytmaga o'zgartirib ham bo'lmaydi.
- Windows nom qoidalari: `CON`, `NUL`, `COM1`, `< > : " / \ | ? *`, nuqta yoki bo'sh joy bilan tugash rad etiladi.
- **Fayl mazmuni o'qilmaydi va AI'ga yuborilmaydi.** Model faqat nomlar va yo'llarni ko'radi.
- Natija tekshiriladi: papka yaratildimi, fayl yangi joydami, eski joyda yo'qmi.

## Testlar
- Unit: 165 (yangi 20 ta: haqiqiy vaqtinchalik papkalarda symlink orqali qochish, `..`, UNC, nom qoidalari, qidiruv, rad etish → yaratilmaydi, ustidan yozmaslik, ruxsatsiz joyga ko'chirmaslik, dasturga aylantirmaslik).
- E2E: papka qo'shish (dialog sinov uchun almashtirilgan) → qidirish → ochish; `.bat` ochilmaydi; ruxsatsiz yo'l IPC orqali ham rad etiladi; AI → `create_folder` → tasdiq → papka haqiqatan yaratildi.

## Windows'da tekshirish
"Downloads papkasidan PDF fayllarni top", "dars jadvali nomli faylni qidir", "Hujjatlarda MARIUS nomli papka yarat", "fayl qayerda joylashganini ko'rsat".
