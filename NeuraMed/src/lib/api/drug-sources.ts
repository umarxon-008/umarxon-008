// NeuraMed — RxNorm, DailyMed v2 va openFDA rasmiy API integratsiyasi
// Barcha API'lar real va ochiq. openFDA uchun ixtiyoriy API key (yuqori limit).
// Rate-limit'dan himoya: server-side TTL cache + Next.js fetch revalidate + DB cache (Medication jadvali).

const DAILYMED = process.env.DAILYMED_API_BASE || "https://dailymed.nlm.nih.gov/dailymed/services/v2";
const OPENFDA = process.env.OPENFDA_API_BASE || "https://api.fda.gov/drug";
const RXNORM = process.env.RXNORM_API_BASE || "https://rxnav.nlm.nih.gov/REST";
const FDA_KEY = process.env.OPENFDA_API_KEY || "";

const DAY = 24 * 60 * 60;

// ── In-memory TTL cache ───────────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = DAY * 1000;
const MAX_ENTRIES = 500;

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}
function cacheSet(key: string, data: unknown) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 10000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: DAY },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("API fetch xatosi:", url, err instanceof Error ? err.message : err);
    return null;
  }
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: DAY }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Mahalliy nomlarni xalqaro (INN/USAN) nomga moslash ────────────────────────
// Faqat nom transliteratsiyasi — tibbiy ma'lumot emas.
const LOCAL_NAME_MAP: Record<string, string> = {
  paracetamol: "acetaminophen",
  paratsetamol: "acetaminophen",
  "парацетамол": "acetaminophen",
  panadol: "acetaminophen",
  amoksitsillin: "amoxicillin",
  amoksisillin: "amoxicillin",
  "амоксициллин": "amoxicillin",
  ibuprofen: "ibuprofen",
  "ибупрофен": "ibuprofen",
  nurofen: "ibuprofen",
  metformin: "metformin",
  "метформин": "metformin",
  omeprazol: "omeprazole",
  "омепразол": "omeprazole",
  azitromitsin: "azithromycin",
  "азитромицин": "azithromycin",
  siprofloksatsin: "ciprofloxacin",
  "ципрофлоксацин": "ciprofloxacin",
  aspirin: "aspirin",
  "аспирин": "aspirin",
  atorvastatin: "atorvastatin",
  "аторвастатин": "atorvastatin",
  amlodipin: "amlodipine",
  "амлодипин": "amlodipine",
  losartan: "losartan",
  setirizin: "cetirizine",
  "цетиризин": "cetirizine",
  loratadin: "loratadine",
  "лоратадин": "loratadine",
  diklofenak: "diclofenac",
  "диклофенак": "diclofenac",
  levotiroksin: "levothyroxine",
  "левотироксин": "levothyroxine",
  enalapril: "enalapril",
  pantoprazol: "pantoprazole",
};

export function normalizeDrugName(input: string): string {
  const q = input.trim().toLowerCase();
  return LOCAL_NAME_MAP[q] ?? q;
}

// ── RxNorm ────────────────────────────────────────────────────────────────────

export interface RxNormResult {
  rxcui: string;
  name: string;
  tty: string;
}

export async function searchRxNorm(input: string): Promise<RxNormResult[]> {
  const name = normalizeDrugName(input);
  const key = `rxnorm:search:${name}`;
  const cached = cacheGet<RxNormResult[]>(key);
  if (cached) return cached;

  const results: RxNormResult[] = [];
  const seen = new Set<string>();
  const push = (r: RxNormResult) => {
    if (r.rxcui && !seen.has(r.rxcui)) {
      seen.add(r.rxcui);
      results.push(r);
    }
  };

  type DrugsResp = {
    drugGroup?: { conceptGroup?: { tty?: string; conceptProperties?: { rxcui: string; name: string; tty: string }[] }[] };
  };
  const json = await fetchJson<DrugsResp>(`${RXNORM}/drugs.json?name=${encodeURIComponent(name)}`);
  for (const group of json?.drugGroup?.conceptGroup ?? []) {
    for (const p of group.conceptProperties ?? []) push({ rxcui: p.rxcui, name: p.name, tty: p.tty });
  }

  // Ingredient (IN) darajasidagi standart nomni boshiga qo'yamiz
  const ingredient = await resolveIngredient(name);
  if (ingredient) results.unshift({ ...ingredient });

  // Topilmasa — taxminiy qidiruv (imlo xatolari uchun)
  if (results.length === 0) {
    type ApproxResp = { approximateGroup?: { candidate?: { rxcui: string; name?: string }[] } };
    const approx = await fetchJson<ApproxResp>(
      `${RXNORM}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=5`
    );
    for (const c of approx?.approximateGroup?.candidate ?? []) {
      if (c.name) push({ rxcui: c.rxcui, name: c.name, tty: "APPROX" });
    }
  }

  const dedup = results.filter((r, i, arr) => arr.findIndex((x) => x.rxcui === r.rxcui) === i);
  cacheSet(key, dedup);
  return dedup;
}

/** Dori nomini RxNorm ingredient (IN) darajasiga standartlashtiradi. */
export async function resolveIngredient(input: string): Promise<RxNormResult | null> {
  const name = normalizeDrugName(input);
  const key = `rxnorm:in:${name}`;
  const cached = cacheGet<RxNormResult | null>(key);
  if (cached !== undefined) return cached;

  type IdResp = { idGroup?: { rxnormId?: string[] } };
  let rxcui =
    (await fetchJson<IdResp>(`${RXNORM}/rxcui.json?name=${encodeURIComponent(name)}&search=2`))?.idGroup
      ?.rxnormId?.[0] ?? null;

  if (!rxcui) {
    type ApproxResp = { approximateGroup?: { candidate?: { rxcui: string }[] } };
    rxcui =
      (await fetchJson<ApproxResp>(`${RXNORM}/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`))
        ?.approximateGroup?.candidate?.[0]?.rxcui ?? null;
  }
  if (!rxcui) {
    cacheSet(key, null);
    return null;
  }

  type RelResp = { relatedGroup?: { conceptGroup?: { conceptProperties?: { rxcui: string; name: string; tty: string }[] }[] } };
  const rel = await fetchJson<RelResp>(`${RXNORM}/rxcui/${rxcui}/related.json?tty=IN`);
  const inProp = rel?.relatedGroup?.conceptGroup?.flatMap((g) => g.conceptProperties ?? [])[0];
  const result = inProp ? { rxcui: inProp.rxcui, name: inProp.name, tty: "IN" } : null;
  cacheSet(key, result);
  return result;
}

export async function getRxcuiName(rxcui: string): Promise<string | null> {
  if (!/^\d+$/.test(rxcui)) return null;
  type PropResp = { properties?: { name?: string } };
  const json = await fetchJson<PropResp>(`${RXNORM}/rxcui/${rxcui}/properties.json`);
  return json?.properties?.name ?? null;
}

// ── DailyMed v2 ───────────────────────────────────────────────────────────────

export interface DailyMedDrug {
  setid: string;
  title: string;
  published_date: string;
}

export async function searchDailyMed(name: string): Promise<DailyMedDrug[]> {
  const key = `dailymed:search:${name.toLowerCase()}`;
  const cached = cacheGet<DailyMedDrug[]>(key);
  if (cached) return cached;

  type Resp = { data?: { setid: string; title: string; published_date: string }[] };
  const json = await fetchJson<Resp>(`${DAILYMED}/spls.json?drug_name=${encodeURIComponent(name)}&pagesize=10`);
  const results: DailyMedDrug[] = (json?.data ?? []).map((i) => ({
    setid: i.setid,
    title: i.title,
    published_date: i.published_date,
  }));
  cacheSet(key, results);
  return results;
}

/** DailyMed SPL XML'dan bo'lim matnlarini ajratadi (openFDA'da topilmagan holat uchun). */
export async function getDailyMedSplSections(setid: string): Promise<Record<string, string>> {
  const key = `dailymed:sections:${setid}`;
  const cached = cacheGet<Record<string, string>>(key);
  if (cached) return cached;

  const xml = await fetchText(`${DAILYMED}/spls/${encodeURIComponent(setid)}.xml`);
  const sections: Record<string, string> = {};
  if (xml) {
    const sectionRe = /<section[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>([\s\S]*?)<\/section>/gi;
    let m: RegExpExecArray | null;
    while ((m = sectionRe.exec(xml)) !== null) {
      const title = stripXml(m[1]).toLowerCase().slice(0, 80);
      const text = stripXml(m[2]).slice(0, 3000);
      if (title && text.length > 20 && !sections[title]) sections[title] = text;
    }
  }
  cacheSet(key, sections);
  return sections;
}

function stripXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ── openFDA drug label ────────────────────────────────────────────────────────

export interface FDALabelResult {
  set_id?: string;
  effective_time?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    route?: string[];
    rxcui?: string[];
    spl_set_id?: string[];
    product_type?: string[];
    substance_name?: string[];
  };
  purpose?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  dosage_forms_and_strengths?: string[];
  boxed_warning?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  precautions?: string[];
  do_not_use?: string[];
  ask_doctor?: string[];
  ask_doctor_or_pharmacist?: string[];
  stop_use?: string[];
  when_using?: string[];
  pregnancy_or_breast_feeding?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  contraindications?: string[];
  pregnancy?: string[];
  nursing_mothers?: string[];
  overdosage?: string[];
  information_for_patients?: string[];
  description?: string[];
  how_supplied?: string[];
}

async function queryOpenFDA(search: string): Promise<FDALabelResult | null> {
  const keyParam = FDA_KEY ? `&api_key=${encodeURIComponent(FDA_KEY)}` : "";
  type Resp = { results?: FDALabelResult[] };
  const json = await fetchJson<Resp>(
    `${OPENFDA}/label.json?search=${encodeURIComponent(search)}&limit=1${keyParam}`
  );
  return json?.results?.[0] ?? null;
}

export async function getOpenFDALabel(opts: {
  setid?: string;
  rxcui?: string;
  name: string;
}): Promise<FDALabelResult | null> {
  const key = `openfda:${opts.setid ?? ""}:${opts.rxcui ?? ""}:${opts.name.toLowerCase()}`;
  const cached = cacheGet<FDALabelResult | null>(key);
  if (cached !== undefined) return cached;

  const n = opts.name.replace(/"/g, "");
  const attempts = [
    opts.setid && `set_id:"${opts.setid}"`,
    opts.rxcui && /^\d+$/.test(opts.rxcui) && `openfda.rxcui:"${opts.rxcui}"`,
    `openfda.generic_name:"${n}"`,
    `openfda.brand_name:"${n}"`,
    `openfda.substance_name:"${n}"`,
  ].filter(Boolean) as string[];

  let result: FDALabelResult | null = null;
  for (const q of attempts) {
    result = await queryOpenFDA(q);
    if (result) break;
  }
  cacheSet(key, result);
  return result;
}

// ── Birlashtirilgan rasmiy label ──────────────────────────────────────────────

export interface RawDrugData {
  query: string;
  standardName: string;
  rxcui?: string;
  rxNormName?: string;
  provider: "DailyMed" | "openFDA";
  setid?: string;
  dailyMedTitle?: string;
  fdaLabel: FDALabelResult | null;
  dailyMedSections: Record<string, string>;
  sourceUrl: string;
  lastUpdated: string;
}

function fdaDate(raw?: string): string | undefined {
  if (!raw || raw.length < 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isoFromDailyMed(raw?: string): string | undefined {
  // "Jun 12, 2024" → "2024-06-12"
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toISOString().split("T")[0];
}

/**
 * 1) RxNorm orqali nomni standartlashtiradi
 * 2) DailyMed'dan SPL setid va sanani topadi
 * 3) openFDA'dan shu SPL bo'limlarini (JSON) oladi; bo'lmasa DailyMed SPL XML'dan
 * Hech narsa topilmasa — null (AI taxmin qilmaydi).
 */
export async function fetchRawDrugData(input: string, rxcuiHint?: string): Promise<RawDrugData | null> {
  let query = input.trim();
  if (rxcuiHint && /^\d+$/.test(rxcuiHint) && !query) {
    query = (await getRxcuiName(rxcuiHint)) ?? "";
  }
  if (!query) return null;

  const ingredient = await resolveIngredient(query);
  const standardName = (ingredient?.name ?? normalizeDrugName(query)).toLowerCase();

  // DailyMed: avval standart nom, keyin asl nom
  let dm = (await searchDailyMed(standardName))[0];
  if (!dm && standardName !== query.toLowerCase()) dm = (await searchDailyMed(query))[0];

  const fdaLabel = await getOpenFDALabel({
    setid: dm?.setid,
    rxcui: rxcuiHint ?? ingredient?.rxcui,
    name: standardName,
  });

  const setid = dm?.setid ?? fdaLabel?.set_id ?? fdaLabel?.openfda?.spl_set_id?.[0];
  let dailyMedSections: Record<string, string> = {};
  if (!fdaLabel && setid) dailyMedSections = await getDailyMedSplSections(setid);

  const hasLabelText = Boolean(fdaLabel) || Object.keys(dailyMedSections).length > 0;
  if (!hasLabelText) return null;

  const provider: "DailyMed" | "openFDA" = setid ? "DailyMed" : "openFDA";
  const sourceUrl = setid
    ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setid}`
    : `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(standardName)}%22&limit=1`;

  const lastUpdated =
    isoFromDailyMed(dm?.published_date) ?? fdaDate(fdaLabel?.effective_time) ?? "Noma'lum";

  return {
    query: input,
    standardName,
    rxcui: ingredient?.rxcui ?? rxcuiHint,
    rxNormName: ingredient?.name,
    provider,
    setid,
    dailyMedTitle: dm?.title,
    fdaLabel,
    dailyMedSections,
    sourceUrl,
    lastUpdated,
  };
}

/** AI'ga beriladigan label matni — faqat rasmiy bo'limlardan. */
export function buildLabelText(raw: RawDrugData): string {
  const f = raw.fdaLabel;
  const cut = (arr: string[] | undefined, n: number) => (arr?.join(" ") ?? "").replace(/\s+/g, " ").slice(0, n);
  const parts: [string, string][] = f
    ? [
        ["Generic name", cut(f.openfda?.generic_name, 200)],
        ["Brand names", cut(f.openfda?.brand_name, 200)],
        ["Route", cut(f.openfda?.route, 100)],
        ["Dosage forms and strengths", cut(f.dosage_forms_and_strengths, 500)],
        ["Purpose", cut(f.purpose, 400)],
        ["Indications and usage", cut(f.indications_and_usage, 1200)],
        ["Dosage and administration", cut(f.dosage_and_administration, 1500)],
        ["Boxed warning", cut(f.boxed_warning, 800)],
        ["Warnings", cut(f.warnings ?? f.warnings_and_cautions, 1500)],
        ["Precautions", cut(f.precautions, 600)],
        ["Do not use", cut(f.do_not_use, 500)],
        ["Ask a doctor", cut(f.ask_doctor ?? f.ask_doctor_or_pharmacist, 500)],
        ["When using", cut(f.when_using, 400)],
        ["Stop use", cut(f.stop_use, 500)],
        ["Contraindications", cut(f.contraindications, 600)],
        ["Adverse reactions", cut(f.adverse_reactions, 1000)],
        ["Drug interactions", cut(f.drug_interactions, 800)],
        ["Pregnancy", cut(f.pregnancy ?? f.pregnancy_or_breast_feeding, 500)],
        ["Nursing mothers", cut(f.nursing_mothers, 300)],
        ["Overdosage", cut(f.overdosage, 400)],
        ["Information for patients", cut(f.information_for_patients, 800)],
      ]
    : Object.entries(raw.dailyMedSections)
        .slice(0, 20)
        .map(([k, v]) => [k, v.slice(0, 1200)] as [string, string]);

  return parts
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `### ${k}\n${v}`)
    .join("\n\n")
    .slice(0, 14000);
}
