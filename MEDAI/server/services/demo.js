/**
 * DEMO REJIM javoblari — AI EMAS.
 * AI kaliti ulanmaganida server shu qoidaga asoslangan javoblarni qaytaradi.
 * Har bir javob interfeysda "DEMO · qoidaga asoslangan" deb aniq belgilanadi.
 * Ma'lumot faqat MEDAI kutubxonasidan (data/medical-terms.json) olinadi.
 */
import { assessMessage, EMERGENCY_TEXT } from './safety.js';
import { findTermsInText, terms, publicTerm, libraryMeta } from './library.js';
import { normalize } from './text.js';

const LIB_NOTE = 'MEDAI kutubxonasi maʼlumoti — tibbiy ekspert tomonidan hali tekshirilmagan.';

function termSources(list) {
  return list.flatMap((t) => t.sources.map((s) => ({ ...s, term: t.term })));
}

function termBlock(t) {
  const lines = [
    `### ${t.term}`,
    `**Sodda qilib:** ${t.simple}`,
    '',
    `**Batafsilroq:** ${t.medical}`,
  ];
  if (t.related?.length) lines.push('', `**Bogʻliq tushunchalar:** ${t.related.join(', ')}`);
  if (t.warning) lines.push('', `> ⚠️ ${t.warning}`);
  return lines.join('\n');
}

const availableTerms = () => terms.map((t) => t.term).join(', ');

/** Tezkor savollar uchun tayyor (statik) tushuntirishlar. */
const TOPICS = [
  {
    match: ['umumiy qon tahlili', "qon tahlilidagi ko'rsatkich", 'qon tahlili ko', 'oak', 'cbc'],
    termIds: ['gemoglobin', 'leykotsit', 'trombotsit'],
    intro:
      'Umumiy qon tahlili (UQT) qon hujayralarining soni va xususiyatlarini koʻrsatadi. Quyida uning asosiy koʻrsatkichlaridan uchtasi haqida MEDAI kutubxonasidagi qisqa maʼlumot:',
    outro:
      'Har bir koʻrsatkich hujjatdagi **reference range** (meʼyoriy oraliq) bilan solishtiriladi. Bu oraliq laboratoriya, yosh va jinsga qarab farq qiladi. Natijangizni tushunish uchun **Tibbiy tahlil** boʻlimiga hujjatni yuklashingiz mumkin.',
  },
  {
    match: ['qarshi ko\'rsatma', 'qarshi korsatma', 'противопоказ'],
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
    match: ['laboratoriya natija', 'tahlil natijasini qanday', 'natijani qanday tushun', 'reference range', 'referens'],
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
    match: ['tibbiy atama', 'atamani sodda', 'atamani tushuntir'],
    text: [
      '### Tibbiy atamani tushuntirish',
      'Qaysi atama haqida bilmoqchisiz? Demo rejimda men faqat MEDAI kutubxonasidagi atamalarni tushuntira olaman:',
      '',
      `**${availableTerms()}**`,
      '',
      'Masalan: *«Kreatinin nima?»* deb yozing yoki **Tibbiy kutubxona** boʻlimidan qidiring.',
    ].join('\n'),
  },
];

/**
 * Demo javob yaratish.
 * @returns {{reply:string, sources:Array, sourceNote:string, kind:string, flags:object}}
 */
export function demoReply(message) {
  const flags = assessMessage(message);
  const text = normalize(message);

  if (flags.emergency) {
    return {
      kind: 'emergency',
      flags,
      reply: [
        '### ⚠️ Bu shoshilinch holat boʻlishi mumkin',
        EMERGENCY_TEXT,
        '',
        'Yordam kelguncha: xotirjam boʻling, yolgʻiz qolmang va imkon boʻlsa yaqinlaringizga xabar bering.',
      ].join('\n'),
      sources: [],
      sourceNote: 'Xavfsizlik qoidasi asosidagi standart ogohlantirish.',
    };
  }

  if (flags.doseRequest) {
    return {
      kind: 'dose',
      flags,
      reply: [
        '### Dozani mustaqil tavsiya qila olmayman',
        'MEDAI dori dozasini belgilamaydi, oʻzgartirmaydi va dorini toʻxtatish yoki almashtirishni tavsiya qilmaydi. Doza yosh, vazn, boshqa kasalliklar va qabul qilinayotgan dorilarga bogʻliq — buni faqat **shifokor yoki farmatsevt** aniqlaydi.',
        '',
        'Nima qilish mumkin:',
        '- dori qutisidagi **rasmiy yoʻriqnomani** oʻqing (uni **Dori qoʻllanmasi** boʻlimida soddaroq koʻrishingiz mumkin);',
        '- dozani oʻzgartirishdan oldin davolovchi shifokoringiz bilan maslahatlashing;',
        '- tasodifan ortiqcha doza qabul qilingan boʻlsa yoki oʻzingizni yomon his qilsangiz — **103** ga qoʻngʻiroq qiling.',
      ].join('\n'),
      sources: [],
      sourceNote: 'Xavfsizlik qoidasi asosidagi standart javob.',
    };
  }

  const found = findTermsInText(message).slice(0, 3);

  if (flags.diagnosisRequest) {
    const parts = [
      '### Tashxis qoʻya olmayman',
      'MEDAI tibbiy maʼlumotni tushunishga yordam beradi, lekin **tashxis qoʻymaydi**. Tashxis uchun shifokor koʻrik oʻtkazadi, shikoyatlar, kasallik tarixi va tekshiruv natijalarini birga baholaydi.',
    ];
    if (found.length) {
      parts.push('', 'Savolingizdagi atamalar haqida umumiy maʼlumot:', '', ...found.map(termBlock));
    }
    parts.push('', 'Belgilaringiz kuchaysa yoki sizni xavotirga solsa, **oilaviy shifokorga** murojaat qiling; shoshilinch holatda — **103**.');
    return {
      kind: 'diagnosis',
      flags,
      reply: parts.join('\n'),
      sources: termSources(found),
      sourceNote: found.length ? LIB_NOTE : 'Xavfsizlik qoidasi asosidagi standart javob.',
    };
  }

  const topic = TOPICS.find((t) => t.match.some((m) => text.includes(normalize(m))));
  if (topic && topic.termIds) {
    const list = topic.termIds.map((id) => terms.find((t) => t.id === id)).filter(Boolean);
    return {
      kind: 'topic',
      flags,
      reply: [topic.intro, '', ...list.map(termBlock), '', topic.outro].join('\n\n'),
      sources: termSources(list),
      sourceNote: LIB_NOTE,
    };
  }
  if (found.length) {
    return {
      kind: 'library',
      flags,
      reply: found.map(termBlock).join('\n\n'),
      sources: termSources(found),
      sourceNote: LIB_NOTE,
    };
  }
  if (topic) {
    return {
      kind: 'topic',
      flags,
      reply: topic.text,
      sources: [],
      sourceNote: 'MEDAI tomonidan tayyorlangan umumiy tushuntirish — manbaga bogʻlanmagan va ekspert tekshirmagan.',
    };
  }

  return {
    kind: 'no_source',
    flags,
    reply: [
      '### Bu savolga demo rejimda javob bera olmayman',
      'Hozir MEDAI **demo rejimda** ishlayapti: AI modeli ulanmagan, shuning uchun men faqat kutubxonadagi atamalar va bir nechta umumiy mavzular boʻyicha maʼlumot bera olaman. Savolingizga mos **manba topilmadi** va men javobni oʻzimdan toʻqimayman.',
      '',
      `Mavjud atamalar: **${availableTerms()}**.`,
      '',
      'Boshqa savollar uchun shifokor yoki farmatsevt bilan maslahatlashing.',
    ].join('\n'),
    sources: [],
    sourceNote: 'Manba topilmadi.',
  };
}

export { publicTerm, libraryMeta };
