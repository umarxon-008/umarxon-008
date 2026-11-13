/**
 * O'zbekcha nutqni tanish uchun test to'plami (prompt §8.5). Har bir toifa alohida baholanadi.
 * Natijalar docs/VOICE_QUALITY.md shabloniga yoziladi.
 */
export type SentenceCategory =
  'qisqa buyruq' | 'uzun gap' | 'raqam va vaqt' | 'dastur nomlari' | 'aralash (rus/ingliz)' | 'tabiiy, tez';

export interface TestSentence {
  id: string;
  category: SentenceCategory;
  text: string;
}

const raw: [SentenceCategory, string][] = [
  ['qisqa buyruq', 'Kalkulyatorni och.'],
  ['qisqa buyruq', 'Eslatmalarimni ko‘rsat.'],
  ['qisqa buyruq', 'To‘xta.'],
  ['qisqa buyruq', 'Javobni ovoz chiqarib o‘qi.'],
  ['qisqa buyruq', 'Yangi papka yarat.'],
  ['qisqa buyruq', 'Diskda qancha bo‘sh joy bor?'],
  ['qisqa buyruq', 'Batareya holatini ko‘rsat.'],
  ['uzun gap', 'Menga C++ dasturlash tilidagi sikllarni oddiy misollar bilan tushuntirib ber.'],
  ['uzun gap', 'Oxirgi suhbatimizda nima haqida gaplashgan edik, qisqacha eslatib yubor.'],
  ['uzun gap', 'Ertaga ertalab darsga tayyorlanishim kerakligini va kitobni olishni unutmasligimni eslat.'],
  ['uzun gap', 'Kompyuterimdan dars jadvali nomli faylni qidirib, qayerda joylashganini ko‘rsat.'],
  ['uzun gap', 'Sun’iy intellekt haqida qisqa ma’lumot berib, uning kundalik hayotdagi foydasini ayt.'],
  ['uzun gap', 'Bugun ob-havo yaxshi bo‘lsa, kechqurun do‘stlarim bilan bog‘ga boramiz.'],
  ['uzun gap', 'Yozgan inshoimdagi grammatik xatolarni topib, to‘g‘ri variantini taklif qil.'],
  ['raqam va vaqt', 'Bugun soat o‘n to‘qqizda vazifamni eslat.'],
  ['raqam va vaqt', 'Uchrashuv ikki ming yigirma oltinchi yil o‘n beshinchi dekabrda bo‘ladi.'],
  ['raqam va vaqt', 'Soat yettidan o‘n besh daqiqa o‘tganda meni uyg‘ot.'],
  ['raqam va vaqt', 'Yuz yigirma beshni o‘n ikkiga ko‘paytir.'],
  ['raqam va vaqt', 'Ertaga ertalab sakkiz yarimda darsim bor.'],
  ['raqam va vaqt', 'Telefon raqamim to‘qson bir, uch yuz o‘n ikki, qirq besh, oltmish yetti.'],
  ['raqam va vaqt', 'Uch kundan keyin, shanba kuni kechqurun.'],
  ['dastur nomlari', 'Chrome brauzerini och.'],
  ['dastur nomlari', 'Visual Studio Code’ni ishga tushir.'],
  ['dastur nomlari', 'Telegramni och.'],
  ['dastur nomlari', 'Microsoft Word’da yangi hujjat och.'],
  ['dastur nomlari', 'YouTube’dan musiqa qo‘y.'],
  ['dastur nomlari', 'Explorer’da Yuklamalar papkasini och.'],
  ['dastur nomlari', 'Obsidian’dagi qaydlarimni ko‘rsat.'],
  ['aralash (rus/ingliz)', 'Downloads papkasidan PDF fayllarni top.'],
  ['aralash (rus/ingliz)', 'YouTube’dan C++ for loop mavzusini o‘zbek tilida tushuntirgan video top.'],
  ['aralash (rus/ingliz)', 'Menga JavaScript’da async await qanday ishlashini tushuntir.'],
  ['aralash (rus/ingliz)', 'Kompyuterimning RAM va CPU holatini ko‘rsat.'],
  ['aralash (rus/ingliz)', 'Brat, bugun nastroyeniye yo‘q, biror kulgili narsa ayt.'],
  ['aralash (rus/ingliz)', 'Wi-Fi ulanmayapti, internetni tekshirib ber.'],
  ['aralash (rus/ingliz)', 'Excel faylidagi jadvalni sortirovka qilish yo‘lini ko‘rsat.'],
  ['tabiiy, tez', 'Qalaysan, bugun nima ishlar qilamiz?'],
  ['tabiiy, tez', 'Ha, mayli, keyinroq qaytamiz bunga.'],
  ['tabiiy, tez', 'Voy, unutib qo‘yibman, tezroq eslatib qo‘y.'],
  ['tabiiy, tez', 'Shuni bir ko‘rib ber-chi, nima xato bor ekan.'],
  ['tabiiy, tez', 'Rahmat, zo‘r bo‘ldi, endi boshqasiga o‘tamiz.'],
  ['tabiiy, tez', 'Iltimos, shu gapni boshqatdan ayt-chi.'],
  ['tabiiy, tez', 'Bo‘ldi, yetadi, o‘chir.'],
];

export const TEST_SENTENCES: TestSentence[] = raw.map(([category, text], i) => ({
  id: `uz-${String(i + 1).padStart(2, '0')}`,
  category,
  text,
}));
