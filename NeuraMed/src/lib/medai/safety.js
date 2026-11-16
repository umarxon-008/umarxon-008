// MEDPERFECT moduli (NeuraMed ga birlashtirilgan). Asl manba: MEDPERFECT/shared/
/**
 * Tibbiy xavfsizlik qoidalari (qoidaga asoslangan, AI emas).
 * Xabar matnidan shoshilinch holat, tashxis yoki doza so'rovi belgilarini aniqlaydi.
 * Natija ham demo, ham AI rejimida interfeysda ogohlantirish ko'rsatish uchun ishlatiladi.
 */
import { normalize } from './text.js';

const EMERGENCY = [
  "ko'krak og'ri", "ko'kragim og'ri", "ko'kragimda og'riq", 'nafas ololma', 'nafas olishim qiyin', 'nafas qisil',
  "hushdan ket", "hushini yo'qot", 'qon ketyapti', 'qon ketmoqda', "qon to'xtamay", 'qon qus', 'insult',
  'yuzim qiyshay', 'yuzi qiyshay', 'gapira olmay', 'tutqanoq', "o'z joni", "o'zimni o'ldir", 'yashashni xohlamay',
  'zaharlan', 'anafilak', 'allergik shok', "tomog'im shish", 'tomoq shish', "yuzim shish",
  'боль в груди', 'не могу дышать', 'задыха', 'потерял сознание', 'потеряла сознание', 'кровотечение', 'инсульт',
  'суицид', 'отравлен', 'анафилак',
  'chest pain', "can't breathe", 'cannot breathe', 'unconscious', 'suicid', 'overdose', 'stroke',
];

const DIAGNOSIS = [
  'tashxis', 'qanday kasallik', 'qaysi kasallik', 'nima kasallik', 'kasalmanmi', 'kasal emasmanmi', 'menda nima bor',
  'диагноз', 'какая у меня болезнь', 'чем я болен', 'diagnos', 'what disease do i have',
];
const DIAGNOSIS_RE = [/menda .{1,40} bormi/, /bu .{1,30} kasalligimi/];

const DOSE = [
  'doza', 'dozani', 'necha mg', 'necha milligram', 'nechta tabletka', 'nechta ichay', 'qancha ichay', 'qancha ichish',
  "ichishni to'xtat", "dorini to'xtat", 'dorini almashtir', "ko'paytirsam", 'kamaytirsam', 'ikki baravar',
  'дозу', 'доза', 'дозировк', 'сколько мг', 'сколько таблеток', 'dose', 'dosage', 'how many mg', 'how many pills',
];

const hasAny = (text, list) => list.some((k) => text.includes(k));

export function assessMessage(raw) {
  const text = normalize(raw);
  return {
    emergency: hasAny(text, EMERGENCY),
    diagnosisRequest: hasAny(text, DIAGNOSIS) || DIAGNOSIS_RE.some((re) => re.test(text)),
    doseRequest: hasAny(text, DOSE),
  };
}

export const EMERGENCY_TEXT =
  "Agar hozir sizda yoki yoningizdagi odamda koʻkrak ogʻrigʻi, nafas qisilishi, hushdan ketish, kuchli qon ketishi, " +
  "yuz qiyshayishi yoki nutq buzilishi kabi belgilar boʻlsa — **darhol 103 (tez tibbiy yordam) yoki 112 ga qoʻngʻiroq qiling**. " +
  'MEDAI shoshilinch yordam oʻrnini bosa olmaydi.';
