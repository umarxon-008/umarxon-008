// MEDPERFECT moduli (NeuraMed ga birlashtirilgan). Asl manba: MEDPERFECT/shared/
/**
 * DEMO REJIM javoblari — AI EMAS (server va brauzer uchun umumiy).
 * Javoblar qoidaga asoslangan va faqat MEDAI kutubxonasi hamda tayyor tushuntirishlardan olinadi.
 * Har bir javob interfeysda "DEMO · qoidaga asoslangan" deb aniq belgilanadi.
 *
 * Foydalanish: demoReply(xabar, prepareLibrary(medical-terms.json))
 */
import { assessMessage, EMERGENCY_TEXT } from './safety.js';
import { findTermsInText } from './library.js';
import { normalize, toNumber } from './text.js';
import { parseRange, compare } from './labParser.js';

const LIB_NOTE = 'MEDAI kutubxonasi maʼlumoti — tibbiy ekspert tomonidan hali tekshirilmagan.';
const GENERAL_NOTE = 'MEDAI tomonidan tayyorlangan umumiy tushuntirish — manbaga bogʻlanmagan va ekspert tekshirmagan.';

const termSources = (list) => list.flatMap((t) => t.sources.map((s) => ({ ...s, term: t.term })));

function termBlock(t, { short = false } = {}) {
  const lines = [`### ${t.term}`, `**Sodda qilib:** ${t.simple}`];
  if (!short) lines.push('', `**Batafsilroq:** ${t.medical}`);
  if (!short && t.related?.length) lines.push('', `**Bogʻliq tushunchalar:** ${t.related.join(', ')}`);
  if (t.warning) lines.push('', `> ⚠️ ${t.warning}`);
  return lines.join('\n');
}

const termList = (lib) => lib.terms.map((t) => t.term).join(', ');
const has = (text, list) => list.some((m) => text.includes(normalize(m)));

/* ---------------- Tayyor mavzular ---------------- */
const TOPICS = [
  {
    id: 'cbc',
    match: ['umumiy qon tahlili', "qon tahlilidagi ko'rsatkich", 'qon tahlili ko', 'oak', 'cbc'],
    termIds: ['gemoglobin', 'eritrotsit', 'leykotsit', 'trombotsit', 'echt'],
    intro: 'Umumiy qon tahlili (UQT) qon hujayralarining soni va xususiyatlarini koʻrsatadi. Quyida uning asosiy koʻrsatkichlari haqida MEDAI kutubxonasidagi qisqa maʼlumot:',
    outro: 'Har bir koʻrsatkich hujjatdagi **reference range** (meʼyoriy oraliq) bilan solishtiriladi. Bu oraliq laboratoriya, yosh va jinsga qarab farq qiladi. Natijangizni tushunish uchun **Tibbiy tahlil** boʻlimiga hujjatni yuklashingiz yoki shu yerga yozishingiz mumkin, masalan: *«Gemoglobinim 112 g/L, meʼyor 120–160»*.',
  },
  {
    id: 'biochem',
    match: ['biokimyoviy tahlil', 'biokimyo', 'биохими'],
    termIds: ['glyukoza', 'xolesterin', 'kreatinin', 'alt', 'bilirubin'],
    intro: 'Biokimyoviy qon tahlili aʼzolar faoliyati va moddalar almashinuvi haqida maʼlumot beradi. Koʻp uchraydigan koʻrsatkichlar:',
    outro: 'Qaysi koʻrsatkichlar kerakligini shifokor belgilaydi. Natijalarni **Tibbiy tahlil** boʻlimida hujjatdagi oraliq bilan solishtirishingiz mumkin.',
  },
  {
    id: 'contra',
    match: ["qarshi ko'rsatma", 'qarshi korsatma', 'противопоказ'],
    text: [
      '### Qarshi koʻrsatmalar nima?',
      'Dori yoʻriqnomasidagi **«Qarshi koʻrsatmalar»** boʻlimida dorini **qabul qilish mumkin boʻlmagan** holatlar sanab oʻtiladi. Masalan:',
      '- dori tarkibidagi moddaga yuqori sezuvchanlik (allergiya);',
      '- muayyan kasalliklar yoki aʼzolar faoliyatining buzilishi;',
      '- yosh cheklovlari, homiladorlik yoki emizish davri;',
      '- baʼzi boshqa dorilar bilan birga qabul qilish.',
      '',
      'Baʼzi yoʻriqnomalarda **«Ehtiyotkorlik bilan»** degan alohida boʻlim ham boʻladi — bu holatlarda dori taqiqlanmagan, lekin shifokor nazorati talab qilinadi.',
      '',
      'Oʻzingizga mosligini **shifokor yoki farmatsevt** aniqlaydi. Yoʻriqnomani soddaroq koʻrish uchun **Dori qoʻllanmasi** boʻlimiga yoʻriqnoma faylini yuklang.',
    ].join('\n'),
  },
  {
    id: 'reading',
    match: ['laboratoriya natija', 'tahlil natijasini qanday', 'natijani qanday tushun', 'natijasini qanday', 'reference range', 'referens', "me'yoriy oraliq nima"],
    text: [
      '### Laboratoriya natijasini qanday oʻqish mumkin?',
      '1. **Koʻrsatkich nomi** — nima oʻlchangan (masalan, gemoglobin).',
      '2. **Natija va birlik** — oʻlchangan qiymat (masalan, 135 g/L). Birlikka eʼtibor bering: bir xil koʻrsatkich turli birliklarda yozilishi mumkin.',
      '3. **Reference range (meʼyoriy oraliq)** — shu laboratoriya uchun odatiy hisoblangan oraliq. U laboratoriya, uskuna, yosh va jinsga qarab farq qiladi.',
      '4. **Belgilar** — baʼzi hujjatlarda oraliqdan tashqaridagi natija «H» (yuqori) yoki «L» (past) bilan belgilanadi.',
      '',
      'Oraliqdan biroz chetga chiqish har doim ham muammo degani emas, oraliq ichidagi natija esa har doim ham hammasi joyida degani emas. Yakuniy xulosani **shifokor** boshqa maʼlumotlar bilan birga beradi.',
    ].join('\n'),
  },
  {
    id: 'prep',
    match: ['tayyorgarlik', 'tayyorlanish', 'tayyorlansa', 'och qoringa', 'tahlil oldidan', 'tahlilga qanday', 'подготовк', 'натощак'],
    text: [
      '### Tahlil topshirishga qanday tayyorlanish mumkin?',
      'Koʻp qon tahlillari uchun umumiy tavsiyalar quyidagicha (aniq koʻrsatmani laboratoriya yoki shifokor beradi):',
      '- **Och qoringa** — odatda tahlildan oldin 8–12 soat ovqat yemaslik soʻraladi; oddiy suv ichish odatda mumkin.',
      '- **Ertalab** topshirish maqsadga muvofiq — baʼzi koʻrsatkichlar kun davomida oʻzgaradi.',
      '- Tahlil oldidan bir kun **spirtli ichimlik** va **ogʻir jismoniy zoʻriqishdan** saqlaning.',
      '- Qabul qilayotgan **dorilaringiz** haqida shifokor yoki laborantga ayting. Dorini oʻzboshimchalik bilan toʻxtatmang.',
      '- Laboratoriyaga biroz oldinroq kelib, **10–15 daqiqa tinch oʻtiring**.',
      '',
      'Har bir tahlilning oʻz talablari boʻlishi mumkin — topshirishdan oldin laboratoriyadan soʻrang.',
    ].join('\n'),
  },
  {
    id: 'doctor',
    match: ['qachon shifokorga', 'shifokorga qachon', 'shifokorga murojaat', 'vrachga qachon', 'doktorga qachon'],
    text: [
      '### Qachon shifokorga murojaat qilish kerak?',
      '**Darhol 103 ga qoʻngʻiroq qiling**, agar: koʻkrak ogʻrigʻi, nafas qisilishi, hushdan ketish, yuz qiyshayishi yoki nutq buzilishi, kuchli qon ketishi boʻlsa.',
      '',
      '**Tez orada shifokorga boring**, agar:',
      '- belgilar bir necha kun ichida yaxshilanmasa yoki kuchaysa;',
      '- yuqori harorat uzoq vaqt tushmasa;',
      '- tahlil natijalari hujjatdagi oraliqdan sezilarli farq qilsa;',
      '- yangi dori boshlagandan keyin gʻayrioddiy belgilar paydo boʻlsa.',
      '',
      'Shifokorga borishda tahlil natijalari, qabul qilayotgan dorilar roʻyxati va savollaringizni oldindan yozib oling.',
    ].join('\n'),
  },
  {
    id: 'bp',
    match: ["bosimni qanday o'lcha", "bosim o'lcha", "qon bosimini o'lcha", 'измерить давление'],
    termIds: ['qon-bosimi'],
    intro: '### Qon bosimini uyda qanday oʻlchash mumkin?\n- Oʻlchashdan 30 daqiqa oldin kofe, chekish va jismoniy zoʻriqishdan saqlaning.\n- 5 daqiqa tinch oʻtiring, oyoqlar polda, orqa suyanchiqda.\n- Manjetni yalangʻoch qoʻlga, yurak balandligida taqing.\n- Oʻlchash paytida gapirmang; 1–2 daqiqa oraliq bilan 2 marta oʻlchab, natijalarni yozib boring.\n\nOʻlchov natijalarini qanday baholashni shifokor sizning holatingizga qarab aytadi.',
    outro: '',
  },
  {
    id: 'leaflet',
    match: ["yo'riqnomani qanday o'qi", "yo'riqnoma qanday", 'instruksiyani qanday'],
    text: [
      '### Dori yoʻriqnomasini qanday oʻqish mumkin?',
      'Rasmiy yoʻriqnomada odatda quyidagi boʻlimlar boʻladi:',
      '- **Tarkibi / faol modda** — dorining asosiy taʼsir etuvchi moddasi;',
      '- **Qoʻllanilishi** — dori qaysi holatlarda qoʻllanishi rasmiy koʻrsatilgan;',
      '- **Qarshi koʻrsatmalar** — qabul qilish mumkin boʻlmagan holatlar;',
      '- **Nojoʻya taʼsirlar** — ehtimoliy noxush taʼsirlar;',
      '- **Dorilararo oʻzaro taʼsiri** — boshqa dorilar bilan birga qabul qilishdagi ehtiyot choralari;',
      '- **Saqlash sharoiti** va yaroqlilik muddati.',
      '',
      '**Dori qoʻllanmasi** boʻlimi yoʻriqnoma matnini shu boʻlimlarga ajratib, soddaroq koʻrsatadi. Dozani esa faqat shifokor yoki farmatsevt bilan aniqlang.',
    ].join('\n'),
  },
  {
    id: 'term',
    match: ['tibbiy atama', 'atamani sodda', 'atamani tushuntir'],
    text: null, // kutubxona ro'yxati bilan dinamik
  },
];

/* ---------------- Savoldagi qiymatni solishtirish ---------------- */
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const RANGE_IN_TEXT = new RegExp(String.raw`(${NUM})\s*(?:-|–|—|\.\.|dan)\s*(${NUM})|([<>≤≥])\s*(${NUM})`);
const VALUE_IN_TEXT = new RegExp(String.raw`(?:^|[^\d.,\p{L}])(${NUM})(?:\s*(×?\s*10\^?\d+\/l|[a-zµμ%/^]+(?:\/[a-z]+)?))?`, 'iu');

function extractValue(message) {
  const text = String(message);
  const r = text.match(RANGE_IN_TEXT);
  let rest = text;
  let range = null;
  if (r) {
    range = r[1] ? parseRange(`${r[1]} - ${r[2]}`) : parseRange(`${r[3]} ${r[4]}`);
    rest = text.slice(0, r.index) + ' '.repeat(r[0].length) + text.slice(r.index + r[0].length);
  }
  const v = rest.match(VALUE_IN_TEXT);
  if (!v) return null;
  return { value: toNumber(v[1]), valueText: v[1], unit: v[2] && !/^(dan|ga|da)$/i.test(v[2]) ? v[2] : '', range, rangeText: r ? r[0].trim() : '' };
}

const STATUS_TEXT = { low: 'siz yozgan oraliqdan **past**', high: 'siz yozgan oraliqdan **yuqori**', normal: 'siz yozgan oraliq **ichida**' };

function valueReply(term, v) {
  const lines = [`### ${term.term}: natijangiz haqida`];
  lines.push(`- Siz yozgan natija: **${v.valueText}${v.unit ? ` ${v.unit}` : ''}**`);
  if (v.range) {
    const status = compare(v.value, v.range);
    lines.push(`- Siz yozgan meʼyoriy oraliq: **${v.rangeText}**`);
    lines.push(`- Solishtirish: natija ${STATUS_TEXT[status]}.`);
    const far = (v.range.high && v.value > v.range.high * 2) || (v.range.low && v.value < v.range.low / 2);
    lines.push('');
    if (status === 'normal') lines.push('Natija oraliq ichida boʻlsa ham, uni shifokor boshqa koʻrsatkichlar va holatingiz bilan birga baholaydi.');
    else lines.push(`Oraliqdan ${far ? '**sezilarli** ' : ''}chetga chiqish oʻzi tashxis emas — sababini faqat shifokor boshqa maʼlumotlar bilan birga aniqlaydi.${far ? ' Natijani imkon qadar tezroq shifokoringiz bilan muhokama qiling.' : ''}`);
  } else {
    lines.push('- Meʼyoriy oraliq: **yozilmagan**');
    lines.push('', 'Natijani baholash uchun **tahlil blankangizdagi meʼyoriy oraliqni** ham yozing (masalan: *«meʼyor 120–160»*). Oraliq laboratoriyaga qarab farq qilgani uchun MEDAI uni oʻzidan qoʻymaydi.');
  }
  lines.push('', termBlock(term, { short: true }));
  if (term.doctorQuestions?.length) {
    lines.push('', '**Shifokorga berish mumkin boʻlgan savollar:**', ...term.doctorQuestions.map((q) => `- ${q}`));
  }
  return lines.join('\n');
}

/* ---------------- Asosiy funksiya ---------------- */

/** @returns {{reply:string, sources:Array, sourceNote:string, kind:string, flags:object}} */
export function demoReply(message, lib) {
  const flags = assessMessage(message);
  const text = normalize(message);
  const out = (kind, reply, sources = [], sourceNote = GENERAL_NOTE) => ({ kind, flags, reply, sources, sourceNote });

  if (flags.emergency) {
    return out('emergency', [
      '### ⚠️ Bu shoshilinch holat boʻlishi mumkin',
      EMERGENCY_TEXT,
      '',
      'Yordam kelguncha: xotirjam boʻling, yolgʻiz qolmang va imkon boʻlsa yaqinlaringizga xabar bering.',
    ].join('\n'), [], 'Xavfsizlik qoidasi asosidagi standart ogohlantirish.');
  }

  if (flags.doseRequest) {
    return out('dose', [
      '### Dozani mustaqil tavsiya qila olmayman',
      'MEDAI dori dozasini belgilamaydi, oʻzgartirmaydi va dorini toʻxtatish yoki almashtirishni tavsiya qilmaydi. Doza yosh, vazn, boshqa kasalliklar va qabul qilinayotgan dorilarga bogʻliq — buni faqat **shifokor yoki farmatsevt** aniqlaydi.',
      '',
      'Nima qilish mumkin:',
      '- dori qutisidagi **rasmiy yoʻriqnomani** oʻqing (uni **Dori qoʻllanmasi** boʻlimida soddaroq koʻrishingiz mumkin);',
      '- dozani oʻzgartirishdan oldin davolovchi shifokoringiz bilan maslahatlashing;',
      '- tasodifan ortiqcha doza qabul qilingan boʻlsa yoki oʻzingizni yomon his qilsangiz — **103** ga qoʻngʻiroq qiling.',
    ].join('\n'), [], 'Xavfsizlik qoidasi asosidagi standart javob.');
  }

  const found = findTermsInText(lib, message).slice(0, 3);

  if (flags.diagnosisRequest) {
    const parts = [
      '### Tashxis qoʻya olmayman',
      'MEDAI tibbiy maʼlumotni tushunishga yordam beradi, lekin **tashxis qoʻymaydi**. Tashxis uchun shifokor koʻrik oʻtkazadi, shikoyatlar, kasallik tarixi va tekshiruv natijalarini birga baholaydi.',
    ];
    if (found.length) parts.push('', 'Savolingizdagi atamalar haqida umumiy maʼlumot:', '', ...found.map((t) => termBlock(t)));
    parts.push('', 'Belgilaringiz kuchaysa yoki sizni xavotirga solsa, **oilaviy shifokorga** murojaat qiling; shoshilinch holatda — **103**.');
    return out('diagnosis', parts.join('\n'), termSources(found), found.length ? LIB_NOTE : 'Xavfsizlik qoidasi asosidagi standart javob.');
  }

  // Savolda ko'rsatkich va son bo'lsa — qiymatni foydalanuvchi yozgan oraliq bilan solishtirish
  if (found.length && found[0].category !== 'Dori atamalari') {
    const v = extractValue(message);
    if (v && v.value !== null) return out('value', valueReply(found[0], v), termSources([found[0]]), LIB_NOTE);
  }

  const topic = TOPICS.find((t) => has(text, t.match));
  if (topic?.termIds) {
    const list = topic.termIds.map((id) => lib.terms.find((t) => t.id === id)).filter(Boolean);
    const body = [topic.intro, ...list.map((t) => termBlock(t, { short: topic.id !== 'bp' }))];
    if (topic.outro) body.push(topic.outro);
    return out('topic', body.join('\n\n'), termSources(list), LIB_NOTE);
  }
  if (found.length) return out('library', found.map((t) => termBlock(t)).join('\n\n'), termSources(found), LIB_NOTE);

  if (topic?.id === 'term') {
    return out('topic', [
      '### Tibbiy atamani tushuntirish',
      'Qaysi atama haqida bilmoqchisiz? Demo rejimda men MEDAI kutubxonasidagi atamalarni tushuntira olaman:',
      '',
      `**${termList(lib)}**`,
      '',
      'Masalan: *«Kreatinin nima?»* deb yozing yoki **Tibbiy kutubxona** boʻlimidan qidiring.',
    ].join('\n'));
  }
  if (topic) return out('topic', topic.text);

  // Salomlashish, minnatdorchilik va imkoniyatlar haqida savol
  if (/^(assalomu? alaykum|assalom|salom|hello|hi|hey|привет|здравствуй|добрый)/.test(text) && text.length < 40) {
    return out('greeting', capabilities('Salom! Men **MEDAI** — tibbiy maʼlumotlarni sodda tilda tushuntiruvchi yordamchiman.'));
  }
  if (/^(rahmat|raxmat|tashakkur|katta rahmat|спасибо|thanks|thank you)/.test(text)) {
    return out('thanks', 'Arzimaydi! Yana savollaringiz boʻlsa, bemalol yozing. Sogʻ boʻling! 🌿');
  }
  if (has(text, ['nima qila olasan', 'nimalar qila olasan', 'nima qilasan', 'sen kimsan', 'kimsan', 'imkoniyat', 'medai nima', 'nima qila olad', 'qanday yordam'])) {
    return out('capabilities', capabilities('Men **MEDAI** — tibbiy maʼlumot yordamchisiman.'));
  }

  return out('no_source', [
    '### Bu savolga demo rejimda javob bera olmayman',
    'Hozir MEDAI **demo rejimda** ishlayapti: AI modeli ulanmagan, shuning uchun men faqat kutubxonadagi atamalar va bir nechta umumiy mavzular boʻyicha maʼlumot bera olaman. Savolingizga mos **manba topilmadi** va men javobni oʻzimdan toʻqimayman.',
    '',
    `Mavjud atamalar: **${termList(lib)}**.`,
    '',
    'Boshqa savollar uchun shifokor yoki farmatsevt bilan maslahatlashing.',
  ].join('\n'), [], 'Manba topilmadi.');
}

function capabilities(intro) {
  return [
    intro,
    '',
    '**Nimalarda yordam bera olaman:**',
    '- 🧪 **Tahlil natijalari** — blankani yuklang yoki natijani yozing (masalan: *«Gemoglobinim 112 g/L, meʼyor 120–160»*), men uni hujjatdagi meʼyoriy oraliq bilan solishtirib tushuntiraman;',
    '- 💊 **Dori yoʻriqnomasi** — qarshi koʻrsatmalar, nojoʻya taʼsirlar va saqlash shartlarini sodda koʻrinishda ajratib beraman;',
    '- 📖 **Tibbiy atamalar** — gemoglobin, kreatinin, ALT, TTG kabi atamalarni oddiy tilda tushuntiraman;',
    '- 📋 **Amaliy maslahatlar** — tahlilga tayyorgarlik, shifokorga qachon murojaat qilish, bosimni toʻgʻri oʻlchash.',
    '',
    'Muhim: men **tashxis qoʻymayman** va **dori dozasini tavsiya qilmayman**. Shoshilinch holatda — **103**.',
  ].join('\n');
}
