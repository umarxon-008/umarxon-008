/** AI modeliga yuboriladigan system prompt va topshiriq matnlari. */

export const SYSTEM_PROMPT = `Sen MEDAI nomli tibbiy maʼlumot yordamchisisan. Tashxis qoʻymaysan, davolash belgilamaysan, dori dozasini tavsiya qilmaysan yoki oʻzgartirmaysan. Faqat berilgan ishonchli hujjatlar va manbalarga tayangan holda umumiy maʼlumotni tushuntirasan. Manba boʻlmasa, buni ochiq aytasan. Foydalanuvchining savoliga oʻzbek tilida, sodda va xolis javob berasan. Shoshilinch tibbiy holat alomatlari haqida xabar berilsa, tez tibbiy yordamga murojaat qilishni tavsiya qilasan. Noaniq maʼlumotni fakt sifatida koʻrsatma. Foydalanuvchining shaxsiy maʼlumotlarini soʻrashni minimallashtir.

Qoʻshimcha qoidalar:
- Hozircha senga ishonchli hujjatlar bazasi (RAG) ulanmagan. Shuning uchun javobing umumiy tibbiy bilimga asoslanadi va rasmiy manba bilan tasdiqlanmagan — buni zarur joyda qisqa eslat. Manba nomini yoki havolasini oʻzingdan toʻqima.
- Oʻzbekistonda tez tibbiy yordam raqami — 103, yagona favqulodda raqam — 112.
- Tashxis soʻralsa: tashxis qoʻya olmasligingni xushmuomalalik bilan ayt, umumiy maʼlumot ber va shifokorga murojaat qilishni tavsiya qil.
- Doza, davolash kursi yoki dorini almashtirish soʻralsa: buni mustaqil tavsiya qila olmasligingni ayt; rasmiy yoʻriqnoma, shifokor yoki farmatsevtga yoʻnaltir.
- Javobni qisqa va tushunarli qil (odatda 80–250 soʻz). Markdown ishlat: qisqa paragraflar, kerak boʻlsa roʻyxatlar, muhim joylar **qalin**. HTML ishlatma.
- Foydalanuvchi oʻzbek tilida yozmasa ham, oʻzbek tilida javob ber (agar boshqa tilni aniq soʻramasa).`;

export const ANALYZE_INSTRUCTION = `Yuqoridagi laboratoriya hujjatini oʻqi va natijani JSON koʻrinishida qaytar.
Qoidalar:
- Faqat hujjatda aniq yozilgan koʻrsatkichlarni ol. Qiymat, birlik va reference range'ni hujjatdagidek koʻchir.
- Hujjatda birlik yoki reference range boʻlmasa, tegishli maydonni boʻsh satr ("") qoldir — oʻzingdan toʻqima.
- "explanation" — koʻrsatkichlarning umumiy maʼnosini oʻzbek tilida, sodda va qisqa tushuntir (Markdown). Tashxis qoʻyma, kasallik nomini natija sababi sifatida taxmin qilma.
- "limitations" — bu talqinning cheklovlari (masalan: reference range laboratoriya, yosh va jinsga qarab farq qiladi; matnni oʻqishda xato boʻlishi mumkin).
- "doctor_questions" — foydalanuvchi shifokorga berishi mumkin boʻlgan 3–5 ta savol.
- "urgent_note" — agar hujjatda juda keskin ogʻish koʻrinsa, foydalanuvchini tezroq shifokorga yoki zarurat boʻlsa 103 ga murojaat qilishga undovchi qisqa ogohlantirish; aks holda "".
- Shaxsiy maʼlumotlarni (ism, tugʻilgan sana, manzil, ID) natijaga kiritma.`;

export const ANALYZE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['test_name', 'items', 'explanation', 'limitations', 'doctor_questions', 'urgent_note'],
  properties: {
    test_name: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'value', 'unit', 'reference_range'],
        properties: {
          name: { type: 'string' },
          value: { type: 'string' },
          unit: { type: 'string' },
          reference_range: { type: 'string' },
        },
      },
    },
    explanation: { type: 'string' },
    limitations: { type: 'array', items: { type: 'string' } },
    doctor_questions: { type: 'array', items: { type: 'string' } },
    urgent_note: { type: 'string' },
  },
};

export const MEDICINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'active_substance', 'indications', 'contraindications', 'side_effects', 'interactions', 'storage', 'document_date', 'source_note'],
  properties: {
    name: { type: 'string' },
    active_substance: { type: 'string' },
    indications: { type: 'string' },
    contraindications: { type: 'string' },
    side_effects: { type: 'string' },
    interactions: { type: 'string' },
    storage: { type: 'string' },
    document_date: { type: 'string' },
    source_note: { type: 'string' },
  },
};

export const MEDICINE_FROM_DOC_INSTRUCTION = `Yuqoridagi dori yoʻriqnomasidan quyidagi boʻlimlarni oʻzbek tilida, sodda qilib ajratib ber va JSON qaytar: dori nomi, faol modda, qoʻllanish sohasi, qarshi koʻrsatmalar, ehtimoliy nojoʻya taʼsirlar, oʻzaro taʼsirlar, saqlash shartlari, hujjat sanasi.
Qoidalar:
- Faqat hujjatda yozilgan maʼlumotni ishlat. Hujjatda boʻlmasa, maydonni "" qoldir.
- Dozalash, davolash kursi yoki dorini almashtirish haqida hech narsa yozma.
- "source_note" ga "Foydalanuvchi yuklagan yoʻriqnoma matni asosida" deb yoz.`;

export const MEDICINE_BY_NAME_INSTRUCTION = (name) => `Foydalanuvchi "${name}" nomli dori haqida soʻradi.
Bu dori haqida umumiy maʼlumotni quyidagi boʻlimlarda oʻzbek tilida, sodda qilib JSON koʻrinishida ber: dori nomi, faol modda, qoʻllanish sohasi, qarshi koʻrsatmalar, ehtimoliy nojoʻya taʼsirlar, oʻzaro taʼsirlar, saqlash shartlari.
Qoidalar:
- Senga rasmiy yoʻriqnoma berilmagan. Shuning uchun "document_date" ni "" qoldir va "source_note" ga bu maʼlumot rasmiy yoʻriqnoma bilan tasdiqlanmaganini, aniq maʼlumot uchun dori qutisidagi rasmiy yoʻriqnoma yoki farmatsevtga murojaat qilish kerakligini yoz.
- Dori nomini tanimasang yoki ishonching komil boʻlmasa, barcha maydonlarni "" qoldir va "source_note" da buni ochiq ayt.
- Dozalash, davolash kursi yoki dorini almashtirish haqida hech narsa yozma.`;
