# Cheklovlar va keyingi bosqichlar

## Ma’lum cheklovlar (MVP)

| Soha | Cheklov |
| --- | --- |
| Sensorlar | Real ma’lumot faqat HTTP ingest orqali. MQTT/Modbus adapterlari yo‘q. |
| Demo generator | So‘rov kelganda ishlaydi (`ensureFresh`, 20 s); hech kim sahifani ochmasa, demo ma’lumot va alertlar yangilanmaydi — keyingi ochilishda bo‘shliq to‘ldiriladi (maks. 31 kun). |
| AI Inspector | Real uskunalar uchun ham faqat sahifa/API so‘rovi bilan ishga tushadi; fon rejalashtiruvchi (cron/worker) yo‘q. Qoidalar chegaralari kodda (`DEFAULT_INSPECTOR_CONFIG`), tashkilot bo‘yicha sozlanmaydi. |
| LLM | Ixtiyoriy; kalit bo‘lmasa qoidaga asoslangan tahlil. Server-side refusal fallback parametri o‘rniga lokal rule-based fallback ishlatiladi. |
| Email | Ulanmagan: parol tiklash havolasi production’da yuborilmaydi; a’zolarga vaqtinchalik parol qo‘lda yetkaziladi; email manzilini o‘zgartirish yo‘q. |
| To‘lov | Ulanmagan; obunalar demo. Narxlar belgilanmagan (platform admin sozlay oladi). |
| 3D xarita | Demo versiya: 2D koordinatalardan avtomatik quriladi; 3D’da tahrirlash, bino/devor modellari va real zavod rejasi yo‘q. WebGL bo‘lmasa xabar ko‘rsatiladi. |
| Smart Control | Faqat simulyatsiya; real adapter yo‘q. |
| Rate limit | Xotirada — bir nechta server instansiyasida umumiy saqlovchi (Redis) kerak. |
| Ko‘p tillilik | Faqat o‘zbek (lotin). |
| Taxminiy tejash | Baseline davrining kunlik o‘rtachasi bilan oddiy taqqoslash; ishlab chiqarish hajmi, ish kunlari, ob-havo hisobga olinmaydi (UI’da “taxminiy” deb belgilangan). |
| Tarix | 15 daqiqadan eski demo ma’lumot 15 daqiqalik qadamda; real ma’lumot qanday kelsa shunday saqlanadi, siqish/arxivlash (rollup) yo‘q. |
| Bildirishnomalar | Faqat ilova ichida; email/Telegram/push yo‘q. |
| Platform admin | Tashkilotlar ro‘yxati va tarif sozlamalari; tashkilot ichki ma’lumotiga kirish yo‘q (ataylab). |
| Dev zaifliklari | `npm audit` toza (Prisma `effect` paketi override bilan yangilangan). |

## Keyingi bosqichlar (tavsiya etilgan tartib)

1. **Pilot integratsiya:** hisoblagich modeli va protokolni aniqlash; MQTT yoki Modbus adapteri; gateway uchun qo‘llanma.
2. **Fon ishlovchisi (worker):** demo generator va AI Inspector’ni cron/queue orqali muntazam ishga tushirish; alert bildirishnomalarini darhol yuborish.
3. **Email xizmati:** parol tiklash, taklif havolasi (vaqtinchalik parol o‘rniga), alert xabarlari.
4. **Inspector sozlamalari:** tashkilot/uskuna bo‘yicha chegaralar, smena jadvali (ish vaqtidan tashqari sarf qoidasi).
5. **Telemetriya rollup:** soatlik/kunlik agregat jadvallar yoki TimescaleDB; eski xom ma’lumotni arxivlash.
6. **To‘lov provayderi** (Payme/Click/Stripe — qaror kerak) va real obuna holatlari.
7. **3D xarita (to‘liq):** 3D’da tahrirlash, uskuna turlariga mos modellar (GLTF), qavatlar, real reja yuklash.
8. **Hisobotlar:** PDF eksport, rejalashtirilgan hisobotlar, smenalar kesimi, mahsulot birligiga energiya (kWh/dona).
9. **Smart Control (real):** faqat `docs/INTEGRATIONS.md` §4 dagi talablar bajarilgandan keyin.
10. Ko‘p tillilik (rus, ingliz), Redis rate limit, observability (log/metrics), 2FA.

## Ochiq qarorlar (pilotdan oldin)

- Qaysi energiya hisoblagich/sensor? MQTT, Modbus gateway yoki boshqa?
- Har bir uskuna ishlab chiqarish holatini qaysi signal orqali beradi?
- AI provayder tanlovi va ma’lumotlarni tashqi API’ga yuborish siyosati.
- Pro narxi va limitlari; to‘lov tizimi.
- Smart Control uchun uskunalar ro‘yxati va xavfsizlik standartlari.
