/**
 * Dorilar o'zaro ta'siri — CHEKLANGAN NAMUNAVIY RO'YXAT.
 * Faqat keng ma'lum, darsliklarda keltirilgan o'zaro ta'sirlar kiritilgan.
 * Ro'yxatda yo'qligi "xavfsiz" degani emas — har doim farmatsevt yoki shifokor bilan tekshirish kerak.
 * Doza tavsiya qilinmaydi.
 */

export type Severity = "high" | "moderate";

/** Faol modda va uning nomlari (o'zbek / rus / ingliz / savdo nomlari, kichik harflarda). */
export const INGREDIENTS: Record<string, { label: string; names: string[]; group?: string[] }> = {
  paracetamol: { label: "Paratsetamol", names: ["paratsetamol", "paracetamol", "acetaminophen", "парацетамол", "panadol", "efferalgan", "tylenol"] },
  ibuprofen: { label: "Ibuprofen", names: ["ibuprofen", "ибупрофен", "nurofen", "нурофен", "ibufen"], group: ["nsaid"] },
  diclofenac: { label: "Diklofenak", names: ["diklofenak", "diclofenac", "диклофенак", "voltaren", "вольтарен"], group: ["nsaid"] },
  aspirin: { label: "Aspirin (atsetilsalitsil kislota)", names: ["aspirin", "аспирин", "atsetilsalitsil", "acetylsalicylic", "ацетилсалициловая", "cardiomagnyl", "кардиомагнил", "thrombo ass"], group: ["nsaid"] },
  naproxen: { label: "Naproksen", names: ["naproksen", "naproxen", "напроксен"], group: ["nsaid"] },
  warfarin: { label: "Varfarin", names: ["varfarin", "warfarin", "варфарин"] },
  clopidogrel: { label: "Klopidogrel", names: ["klopidogrel", "clopidogrel", "клопидогрел", "plavix"] },
  omeprazole: { label: "Omeprazol", names: ["omeprazol", "omeprazole", "омепразол", "omez", "омез"] },
  metformin: { label: "Metformin", names: ["metformin", "метформин", "siofor", "сиофор", "glucophage", "глюкофаж"] },
  enalapril: { label: "Enalapril", names: ["enalapril", "эналаприл", "enap"], group: ["acei"] },
  lisinopril: { label: "Lizinopril", names: ["lizinopril", "lisinopril", "лизиноприл"], group: ["acei"] },
  spironolactone: { label: "Spironolakton", names: ["spironolakton", "spironolactone", "спиронолактон", "veroshpiron", "верошпирон"] },
  potassium: { label: "Kaliy preparatlari", names: ["kaliy", "potassium", "калий", "asparkam", "аспаркам", "panangin", "панангин"] },
  atorvastatin: { label: "Atorvastatin", names: ["atorvastatin", "аторвастатин"], group: ["statin"] },
  simvastatin: { label: "Simvastatin", names: ["simvastatin", "симвастатин"], group: ["statin"] },
  clarithromycin: { label: "Klaritromitsin", names: ["klaritromitsin", "clarithromycin", "кларитромицин"] },
  ciprofloxacin: { label: "Siprofloksatsin", names: ["siprofloksatsin", "ciprofloxacin", "ципрофлоксацин", "tsiprolet", "ципролет"] },
  antacid: { label: "Antatsidlar / kalsiy / temir", names: ["antatsid", "almagel", "алмагель", "maalox", "маалокс", "kalsiy", "calcium", "кальций", "temir", "iron", "железо", "ferrum", "sorbifer", "сорбифер"] },
  levothyroxine: { label: "Levotiroksin", names: ["levotiroksin", "levothyroxine", "левотироксин", "l-tiroksin", "эутирокс", "euthyrox"] },
  sildenafil: { label: "Sildenafil", names: ["sildenafil", "силденафил", "viagra"] },
  nitrate: { label: "Nitratlar (nitroglitserin)", names: ["nitroglitserin", "nitroglycerin", "нитроглицерин", "isosorbid", "isosorbide", "изосорбид"] },
  sertraline: { label: "Sertralin / fluoksetin (SIOZS)", names: ["sertralin", "sertraline", "сертралин", "fluoksetin", "fluoxetine", "флуоксетин"], group: ["ssri"] },
  tramadol: { label: "Tramadol", names: ["tramadol", "трамадол"] },
  alcohol: { label: "Spirtli ichimlik", names: ["spirt", "alkogol", "alcohol", "алкоголь", "aroq", "pivo", "vino"] },
};

interface Rule { a: string; b: string; severity: Severity; effect: string; advice: string }

/** a/b — modda nomi yoki "group:<guruh>". */
const RULES: Rule[] = [
  { a: "warfarin", b: "group:nsaid", severity: "high", effect: "Qon ketish xavfi sezilarli oshadi.", advice: "Birga qabul qilmang — shifokor bilan muqobilini muhokama qiling." },
  { a: "clopidogrel", b: "group:nsaid", severity: "high", effect: "Qon ketish, ayniqsa oshqozon-ichakdan qon ketish xavfi oshadi.", advice: "Shifokor ruxsatisiz birga qabul qilmang." },
  { a: "group:nsaid", b: "group:nsaid", severity: "high", effect: "Ikki yalligʻlanishga qarshi (NSAID) dori birga — oshqozon yarasi va qon ketish xavfi oshadi, foyda oshmaydi.", advice: "Odatda bittasi yetarli. Farmatsevt yoki shifokor bilan tekshiring." },
  { a: "group:acei", b: "spironolactone", severity: "high", effect: "Qonda kaliy haddan tashqari oshishi mumkin (giperkaliemiya).", advice: "Faqat shifokor nazoratida va kaliy tahlili bilan." },
  { a: "group:acei", b: "potassium", severity: "high", effect: "Qonda kaliy haddan tashqari oshishi mumkin.", advice: "Kaliy preparatini oʻzingiz qoʻshmang — shifokor bilan kelishing." },
  { a: "group:acei", b: "group:nsaid", severity: "moderate", effect: "Bosim tushiruvchi taʼsir susayadi, buyrak faoliyatiga yuk tushadi.", advice: "Uzoq muddat birga ichish kerak boʻlsa, shifokorga ayting." },
  { a: "clarithromycin", b: "group:statin", severity: "high", effect: "Statin qondagi miqdori oshib, mushak shikastlanishi xavfi kuchayadi.", advice: "Antibiotik kursi davomida statin boʻyicha shifokordan koʻrsatma oling." },
  { a: "sildenafil", b: "nitrate", severity: "high", effect: "Bosim keskin va xavfli darajada tushishi mumkin.", advice: "Birga qabul qilish mumkin emas." },
  { a: "group:ssri", b: "tramadol", severity: "high", effect: "Serotonin sindromi va tutqanoq xavfi oshadi.", advice: "Shifokor ruxsatisiz birga qabul qilmang." },
  { a: "clopidogrel", b: "omeprazole", severity: "moderate", effect: "Omeprazol klopidogrel samarasini kamaytirishi mumkin.", advice: "Shifokordan boshqa oshqozon himoyasi variantini soʻrang." },
  { a: "ciprofloxacin", b: "antacid", severity: "moderate", effect: "Antibiotik ichakdan yomon soʻriladi va samarasi kamayadi.", advice: "Qabul vaqtlarini bir necha soatga ajrating — aniq vaqtni farmatsevtdan soʻrang." },
  { a: "levothyroxine", b: "antacid", severity: "moderate", effect: "Levotiroksin yomon soʻriladi.", advice: "Qabul vaqtlarini ajrating — aniq vaqtni shifokordan soʻrang." },
  { a: "paracetamol", b: "alcohol", severity: "moderate", effect: "Jigarga zarar yetish xavfi oshadi.", advice: "Paratsetamol qabul qilayotganda spirtli ichimlikdan saqlaning." },
  { a: "metformin", b: "alcohol", severity: "moderate", effect: "Qand keskin tushishi va laktatsidoz xavfi oshadi.", advice: "Spirtli ichimlikdan saqlaning yoki shifokor bilan maslahatlashing." },
  { a: "warfarin", b: "alcohol", severity: "moderate", effect: "Varfarin taʼsiri oʻzgarib, qon ketish xavfi oshishi mumkin.", advice: "Spirtli ichimlikdan saqlaning." },
  { a: "warfarin", b: "paracetamol", severity: "moderate", effect: "Paratsetamolni muntazam ichish varfarin taʼsirini kuchaytirishi mumkin.", advice: "Muntazam ichish kerak boʻlsa, shifokorga ayting." },
];

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").replace(/\s+/g, " ").trim();

/** Matndan faol moddani topish (savdo nomi, rus yoki ingliz nomi ham bo'lishi mumkin). */
export function identify(name: string): string | null {
  const n = norm(name);
  if (!n) return null;
  for (const [id, ing] of Object.entries(INGREDIENTS)) if (ing.names.some((x) => n.includes(x))) return id;
  return null;
}

const matches = (id: string, sel: string) => (sel.startsWith("group:") ? (INGREDIENTS[id]?.group || []).includes(sel.slice(6)) : id === sel);

export interface Finding { a: string; b: string; aLabel: string; bLabel: string; severity: Severity | "duplicate"; effect: string; advice: string }

export function checkInteractions(inputs: string[]) {
  const items = inputs.map((raw) => ({ raw: raw.trim(), id: identify(raw) })).filter((x) => x.raw);
  const known = items.filter((x) => x.id) as { raw: string; id: string }[];
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      const A = known[i], B = known[j];
      if (A.id === B.id) {
        const key = `dup:${A.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({ a: A.raw, b: B.raw, aLabel: INGREDIENTS[A.id].label, bLabel: INGREDIENTS[B.id].label, severity: "duplicate", effect: "Bir xil faol modda ikki marta — umumiy doza oshib ketishi mumkin.", advice: "Ikkalasini birga ichmang; farmatsevtdan aniqlang." });
        }
        continue;
      }
      for (const r of RULES) {
        const hit = (matches(A.id, r.a) && matches(B.id, r.b)) || (matches(A.id, r.b) && matches(B.id, r.a));
        const key = [A.id, B.id].sort().join("+");
        if (hit && !seen.has(key)) {
          seen.add(key);
          findings.push({ a: A.raw, b: B.raw, aLabel: INGREDIENTS[A.id].label, bLabel: INGREDIENTS[B.id].label, severity: r.severity, effect: r.effect, advice: r.advice });
        }
      }
    }
  }
  const order = { high: 0, duplicate: 1, moderate: 2 } as const;
  findings.sort((x, y) => order[x.severity] - order[y.severity]);
  return {
    findings,
    recognized: known.map((k) => ({ raw: k.raw, label: INGREDIENTS[k.id].label })),
    unknown: items.filter((x) => !x.id).map((x) => x.raw),
  };
}

export const KNOWN_COUNT = { ingredients: Object.keys(INGREDIENTS).length, rules: RULES.length };
