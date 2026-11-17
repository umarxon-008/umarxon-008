/**
 * Belgilar bo'yicha mutaxassisga yo'naltirish (MEDCONNECT). Qoidaga asoslangan — TASHXIS EMAS,
 * faqat qaysi mutaxassisdan boshlash qulayligini taklif qiladi. Xavfli belgilar alohida tekshiriladi.
 */
const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "'");

const MAP: { specialty: string; words: string[] }[] = [
  { specialty: "Kardiolog", words: ["yurak", "ko'krak", "bosim", "hansira", "yurak urishi", "serdc", "сердц", "давлен", "груд", "одышк", "heart", "chest", "blood pressure", "palpitat", "жүрек", "қысым", "жүрөк", "басым", "дил", "фишор"] },
  { specialty: "Nevrolog", words: ["bosh og'ri", "bosh aylan", "uyqu", "uvish", "karaxt", "migren", "голов", "головокруж", "бессонниц", "онемен", "headache", "dizz", "migraine", "numb", "insomnia", "бас ауру", "баш оору", "дарди сар", "хоб"] },
  { specialty: "Endokrinolog", words: ["qand", "diabet", "chanqo", "qalqonsimon", "gormon", "tez ozish", "сахар", "диабет", "жажд", "щитовид", "гормон", "sugar", "diabetes", "thirst", "thyroid", "hormone", "қант", "кант", "қанд"] },
  { specialty: "Pediatr", words: ["bola", "chaqaloq", "farzand", "o'g'lim", "qizim", "ребен", "ребён", "малыш", "сын", "дочь", "child", "baby", "my son", "daughter", "бала", "кӯдак", "бача"] },
  { specialty: "Laborant-shifokor", words: ["tahlil natija", "tahlil topshir", "анализ", "результат анализ", "lab test", "test result", "талдау", "анализ"] },
];

export function routeSymptoms(text: string) {
  const n = norm(text);
  const scores = MAP.map((m) => ({ specialty: m.specialty, hits: m.words.filter((w) => n.includes(w)) })).filter((m) => m.hits.length);
  scores.sort((a, b) => b.hits.length - a.hits.length);
  const best = scores[0];
  return {
    specialty: best ? best.specialty : "Terapevt",
    matched: best ? best.hits.slice(0, 4) : [],
    alternatives: scores.slice(1, 3).map((s) => s.specialty),
    fallback: !best,
  };
}
