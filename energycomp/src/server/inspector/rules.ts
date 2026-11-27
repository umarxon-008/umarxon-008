// AI Inspector — qoidaga asoslangan aniqlash (rule engine). Sof funksiyalar: faqat berilgan
// o'lchovlardan xulosa chiqaradi, hech qanday ma'lumot to'qib chiqarmaydi.
import { energyKwhFromPower, round } from '@/lib/energy';
import { formatDuration } from '@/lib/format';
import { resolveThresholds } from '@/lib/status';
import type { AlertRuleName, ConfidenceName, SeverityName } from '@/lib/labels';

export interface Evidence {
  label: string;
  value: number | string;
  unit?: string;
  at?: string;
}

export interface Detection {
  rule: AlertRuleName;
  severity: SeverityName;
  title: string;
  explanation: string;
  recommendation: string;
  confidence: ConfidenceName;
  evidence: Evidence[];
  facts: string[];
  assumptions: string[];
  windowStart: Date;
  windowEnd: Date;
}

export interface InspectorEquipment {
  id: string;
  name: string;
  nominalPowerKw: number;
  baselinePowerKw: number | null;
  idleThresholdKw: number | null;
  standbyThresholdKw: number | null;
  hasProductionSignal: boolean;
  lastSeenAt: Date | null;
}

export interface InspectorInput {
  now: Date;
  equipment: InspectorEquipment;
  /** O'sish tartibida, kamida so'nggi ~90 daqiqa */
  telemetry: { timestamp: Date; powerKw: number; intervalSeconds: number }[];
  signals: { timestamp: Date; isProducing: boolean }[];
  /** Konfiguratsiya qilingan baseline bo'lmasa — tarixdan hisoblangan o'rtacha ishlash quvvati */
  historicalBaselineKw: number | null;
  config?: Partial<InspectorConfig>;
}

export interface InspectorConfig {
  noProductionWindowMin: number;
  noDataAfterMin: number;
  aboveBaselineWindowMin: number;
  aboveBaselineRatio: number;
  criticalBaselineRatio: number;
  suddenWindowMin: number;
  suddenReferenceMin: number;
  suddenIncreaseRatio: number;
  longStandbyMin: number;
}

export const DEFAULT_INSPECTOR_CONFIG: InspectorConfig = {
  noProductionWindowMin: 5,
  noDataAfterMin: 10,
  aboveBaselineWindowMin: 30,
  aboveBaselineRatio: 1.2,
  criticalBaselineRatio: 1.5,
  suddenWindowMin: 10,
  suddenReferenceMin: 60,
  suddenIncreaseRatio: 1.8,
  longStandbyMin: 60,
};

const MIN = 60_000;

function inWindow<T extends { timestamp: Date }>(items: T[], from: number, to: number): T[] {
  return items.filter((x) => x.timestamp.getTime() > from && x.timestamp.getTime() <= to);
}

/** Oraliq o'lchovlar bilan qanchalik qoplanganini (0..1) hisoblaydi. */
function coverage(readings: { intervalSeconds: number }[], windowMs: number): number {
  const covered = readings.reduce((s, r) => s + r.intervalSeconds * 1000, 0);
  return Math.min(1, covered / windowMs);
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function energyOf(readings: { powerKw: number; intervalSeconds: number }[]): number {
  return readings.reduce((s, r) => s + energyKwhFromPower(r.powerKw, r.intervalSeconds), 0);
}

const SAFETY_NOTE = 'AI tavsiyasi operator qarorini almashtirmaydi.';

export function ruleNoProductionSignal(input: InspectorInput, cfg: InspectorConfig): Detection | null {
  const { equipment: eq, now } = input;
  if (!eq.hasProductionSignal) return null; // Signal manbasi yo'q — xulosa chiqarib bo'lmaydi
  const windowMs = cfg.noProductionWindowMin * MIN;
  const from = now.getTime() - windowMs;
  const readings = inWindow(input.telemetry, from, now.getTime());
  if (readings.length < 3 || coverage(readings, windowMs) < 0.8) return null;
  // Faqat faol ishlash quvvatida (kutish rejimidan yuqori) — kutish holati LONG_STANDBY qoidasida.
  const { standbyKw } = resolveThresholds(eq);
  if (!readings.every((r) => r.powerKw >= standbyKw)) return null;

  const signals = inWindow(input.signals, from, now.getTime());
  if (signals.some((s) => s.isProducing)) return null;

  const avgKw = avg(readings.map((r) => r.powerKw));
  const energy = energyOf(readings);
  const windowStart = new Date(from);
  const evidence: Evidence[] = [
    { label: "O'rtacha quvvat", value: round(avgKw, 2), unit: 'kW' },
    { label: 'Sarflangan energiya', value: round(energy, 3), unit: 'kWh' },
    { label: 'Kuzatuv oralig‘i', value: cfg.noProductionWindowMin, unit: 'daqiqa' },
    { label: 'O‘lchovlar soni', value: readings.length },
    { label: 'Ishlab chiqarish signallari', value: signals.length === 0 ? 'kelmadi' : `${signals.length} ta, barchasi "ishlab chiqarmayapti"` },
  ];

  if (signals.length === 0) {
    return {
      rule: 'NO_PRODUCTION_SIGNAL',
      severity: 'WARNING',
      title: `${eq.name}: energiya sarflanmoqda, ishlab chiqarish signali kelmadi`,
      explanation:
        `Uskuna ${cfg.noProductionWindowMin} daqiqadan beri energiya sarflayapti (o'rtacha ${round(avgKw, 1)} kW), ` +
        'ammo shu oraliqda ishlab chiqarish signali qayd etilmadi. Holatni tekshiring. ' +
        'Bu bekor ishlashni yoki signal uzatishdagi nosozlikni bildirishi mumkin.',
      recommendation: "Jarayonni tekshiring. Xavfsiz bo'lsa, uskunani to'xtatishni ko'rib chiqing. " + SAFETY_NOTE,
      confidence: 'MEDIUM',
      evidence,
      facts: [
        `So'nggi ${cfg.noProductionWindowMin} daqiqada ${readings.length} ta o'lchov: quvvat kutish chegarasidan (${round(standbyKw, 2)} kW) yuqori.`,
        `Shu oraliqda ${round(energy, 3)} kWh energiya sarflandi.`,
        'Shu oraliqda ishlab chiqarish signali kelmadi.',
      ],
      assumptions: [
        'Uskuna mahsulot ishlab chiqarmayotgan bo‘lishi mumkin — bu tasdiqlanmagan taxmin.',
        'Signal uzatgich yoki gateway’da nosozlik bo‘lishi ham mumkin.',
      ],
      windowStart,
      windowEnd: now,
    };
  }

  return {
    rule: 'NO_PRODUCTION_SIGNAL',
    severity: 'WARNING',
    title: `${eq.name}: energiya sarflanmoqda, ishlab chiqarish signali "ishlab chiqarmayapti"`,
    explanation:
      `Uskuna ${cfg.noProductionWindowMin} daqiqadan beri o'rtacha ${round(avgKw, 1)} kW quvvat sarflayapti, ` +
      'ishlab chiqarish signali esa shu oraliqda ishlab chiqarish bo‘lmaganini ko‘rsatmoqda.',
    recommendation: "Jarayonni tekshiring. Xavfsiz bo'lsa, uskunani to'xtatishni ko'rib chiqing. " + SAFETY_NOTE,
    confidence: 'HIGH',
    evidence,
    facts: [
      `So'nggi ${cfg.noProductionWindowMin} daqiqada quvvat kutish chegarasidan yuqori bo'ldi.`,
      `Ishlab chiqarish signali ${signals.length} marta "ishlab chiqarmayapti" holatini yubordi.`,
    ],
    assumptions: ['Uskuna bekor (yuklamasiz) ishlayotgan bo‘lishi ehtimoli yuqori.'],
    windowStart,
    windowEnd: now,
  };
}

export function ruleNoData(input: InspectorInput, cfg: InspectorConfig): Detection | null {
  const { equipment: eq, now } = input;
  const last = eq.lastSeenAt;
  const silentMs = last ? now.getTime() - last.getTime() : Infinity;
  if (silentMs < cfg.noDataAfterMin * MIN) return null;
  const longSilence = silentMs >= 60 * MIN;
  return {
    rule: 'NO_DATA',
    severity: longSilence ? 'CRITICAL' : 'WARNING',
    title: `${eq.name}: uskunadan ma'lumot kelmayapti`,
    explanation: last
      ? `Oxirgi o'lchov ${formatDuration(silentMs)} oldin keldi. Bu uskuna to'xtaganini anglatmaydi — faqat ma'lumot kelmayapti, shu sabab uning sarfini kuzatib bo'lmayapti.`
      : "Bu uskunadan hali birorta ham o'lchov kelmagan.",
    recommendation: 'Sensor, gateway va tarmoq ulanishini hamda sensorning elektr ta’minotini tekshiring.',
    confidence: 'HIGH',
    evidence: [
      last ? { label: "Oxirgi o'lchov", value: last.toISOString(), at: last.toISOString() } : { label: "Oxirgi o'lchov", value: "yo'q" },
      last
        ? { label: "Ma'lumotsiz vaqt", value: Math.round(silentMs / MIN), unit: 'daqiqa' }
        : { label: "Ma'lumotsiz vaqt", value: 'o‘lchov hali kelmagan' },
    ],
    facts: [last ? `So'nggi ${Math.round(silentMs / MIN)} daqiqa ichida o'lchov kelmadi.` : "O'lchov umuman kelmagan."],
    assumptions: ['Sabab aloqa uzilishi, sensor nosozligi yoki uskuna elektr ta’minotining o‘chirilishi bo‘lishi mumkin.'],
    windowStart: last ?? new Date(now.getTime() - cfg.noDataAfterMin * MIN),
    windowEnd: now,
  };
}

export function ruleAboveBaseline(input: InspectorInput, cfg: InspectorConfig): Detection | null {
  const { equipment: eq, now } = input;
  const configured = eq.baselinePowerKw;
  const baseline = configured ?? input.historicalBaselineKw;
  if (!baseline || baseline <= 0) return null;
  const windowMs = cfg.aboveBaselineWindowMin * MIN;
  const readings = inWindow(input.telemetry, now.getTime() - windowMs, now.getTime());
  if (readings.length < 3 || coverage(readings, windowMs) < 0.7) return null;
  const { standbyKw } = resolveThresholds(eq);
  const running = readings.filter((r) => r.powerKw >= standbyKw);
  if (running.length < readings.length * 0.8) return null;
  const avgKw = avg(running.map((r) => r.powerKw));
  const ratio = avgKw / baseline;
  if (ratio < cfg.aboveBaselineRatio) return null;
  const extraKwh = energyOf(running) - energyOf(running.map((r) => ({ ...r, powerKw: baseline })));
  return {
    rule: 'ABOVE_BASELINE',
    severity: ratio >= cfg.criticalBaselineRatio ? 'CRITICAL' : 'WARNING',
    title: `${eq.name}: quvvat odatiydan ${Math.round((ratio - 1) * 100)}% yuqori`,
    explanation:
      `So'nggi ${cfg.aboveBaselineWindowMin} daqiqada o'rtacha quvvat ${round(avgKw, 1)} kW bo'ldi, ` +
      `odatiy (baseline) qiymat esa ${round(baseline, 1)} kW. Shu oraliqda taxminan ${round(extraKwh, 2)} kWh ortiqcha energiya sarflandi.`,
    recommendation:
      "Yuklama, sozlamalar, ishqalanish/eskirish, sovutish va izolyatsiyani tekshiring. Holat davom etsa, texnik xizmat ko'rsatishni rejalashtiring. " +
      SAFETY_NOTE,
    confidence: configured ? 'HIGH' : 'MEDIUM',
    evidence: [
      { label: "O'rtacha quvvat", value: round(avgKw, 2), unit: 'kW' },
      { label: configured ? 'Belgilangan baseline' : 'Tarixiy baseline (7 kun)', value: round(baseline, 2), unit: 'kW' },
      { label: 'Nisbat', value: round(ratio, 2), unit: '×' },
      { label: 'Ortiqcha energiya (taxminiy)', value: round(extraKwh, 3), unit: 'kWh' },
      { label: 'Kuzatuv oralig‘i', value: cfg.aboveBaselineWindowMin, unit: 'daqiqa' },
    ],
    facts: [
      `O'rtacha quvvat ${round(avgKw, 1)} kW, baseline ${round(baseline, 1)} kW (${round(ratio, 2)}×).`,
    ],
    assumptions: [
      configured
        ? 'Baseline foydalanuvchi tomonidan belgilangan; ishlab chiqarish hajmi oshgan bo‘lsa, yuqori sarf normal bo‘lishi mumkin.'
        : 'Baseline so‘nggi 7 kunlik ishlash quvvatidan hisoblangan va taxminiy.',
    ],
    windowStart: new Date(now.getTime() - windowMs),
    windowEnd: now,
  };
}

export function ruleSuddenChange(input: InspectorInput, cfg: InspectorConfig): Detection | null {
  const { equipment: eq, now } = input;
  const t = now.getTime();
  const recent = inWindow(input.telemetry, t - cfg.suddenWindowMin * MIN, t);
  const reference = inWindow(
    input.telemetry,
    t - (cfg.suddenWindowMin + cfg.suddenReferenceMin) * MIN,
    t - cfg.suddenWindowMin * MIN,
  );
  if (recent.length < 3 || coverage(recent, cfg.suddenWindowMin * MIN) < 0.7) return null;
  if (reference.length < 3 || coverage(reference, cfg.suddenReferenceMin * MIN) < 0.6) return null;
  const recentAvg = avg(recent.map((r) => r.powerKw));
  const refAvg = avg(reference.map((r) => r.powerKw));
  const { standbyKw } = resolveThresholds(eq);
  if (refAvg < standbyKw * 0.5) return null; // to'xtagan holatdan ishga tushish — odatiy
  const ratio = recentAvg / refAvg;
  const absChange = Math.abs(recentAvg - refAvg);
  if (absChange < eq.nominalPowerKw * 0.15) return null;
  if (ratio < cfg.suddenIncreaseRatio) return null;
  return {
    rule: 'SUDDEN_CHANGE',
    severity: 'WARNING',
    title: `${eq.name}: sarf keskin oshdi (${round(ratio, 1)}×)`,
    explanation:
      `So'nggi ${cfg.suddenWindowMin} daqiqadagi o'rtacha quvvat ${round(recentAvg, 1)} kW, ` +
      `undan oldingi ${cfg.suddenReferenceMin} daqiqada esa ${round(refAvg, 1)} kW edi.`,
    recommendation:
      "O'zgarish rejalashtirilgan jarayon (yangi partiya, rejim almashuvi) bilan bog'liqligini tekshiring. Aks holda uskunani ko'zdan kechiring. " +
      SAFETY_NOTE,
    confidence: 'MEDIUM',
    evidence: [
      { label: `So'nggi ${cfg.suddenWindowMin} daqiqa o'rtachasi`, value: round(recentAvg, 2), unit: 'kW' },
      { label: `Oldingi ${cfg.suddenReferenceMin} daqiqa o'rtachasi`, value: round(refAvg, 2), unit: 'kW' },
      { label: 'Nisbat', value: round(ratio, 2), unit: '×' },
    ],
    facts: [`Quvvat ${round(refAvg, 1)} kW dan ${round(recentAvg, 1)} kW ga oshdi.`],
    assumptions: ['Rejalashtirilgan yuklama o‘zgarishi bo‘lsa, bu holat normal bo‘lishi mumkin.'],
    windowStart: new Date(t - (cfg.suddenWindowMin + cfg.suddenReferenceMin) * MIN),
    windowEnd: now,
  };
}

export function ruleLongStandby(input: InspectorInput, cfg: InspectorConfig): Detection | null {
  const { equipment: eq, now } = input;
  const windowMs = cfg.longStandbyMin * MIN;
  const readings = inWindow(input.telemetry, now.getTime() - windowMs, now.getTime());
  if (readings.length < 3 || coverage(readings, windowMs) < 0.8) return null;
  const { idleKw, standbyKw } = resolveThresholds(eq);
  if (!readings.every((r) => r.powerKw >= idleKw && r.powerKw < standbyKw)) return null;
  const energy = energyOf(readings);
  const avgKw = avg(readings.map((r) => r.powerKw));
  return {
    rule: 'LONG_STANDBY',
    severity: 'INFO',
    title: `${eq.name}: ${cfg.longStandbyMin} daqiqadan ortiq kutish rejimida`,
    explanation:
      `Uskuna so'nggi ${cfg.longStandbyMin} daqiqa davomida kutish rejimida (o'rtacha ${round(avgKw, 2)} kW) turibdi ` +
      `va ${round(energy, 2)} kWh energiya sarfladi.`,
    recommendation:
      "Yaqin vaqtda ishlatish rejalashtirilmagan bo'lsa va jarayon xavfsiz bo'lsa, uskunani to'xtatishni ko'rib chiqing. " +
      SAFETY_NOTE,
    confidence: 'HIGH',
    evidence: [
      { label: "O'rtacha quvvat", value: round(avgKw, 2), unit: 'kW' },
      { label: 'Kutish rejimida sarflangan energiya', value: round(energy, 3), unit: 'kWh' },
      { label: 'Kutish chegarasi', value: round(standbyKw, 2), unit: 'kW' },
      { label: 'Davomiylik', value: cfg.longStandbyMin, unit: 'daqiqa' },
    ],
    facts: [`${cfg.longStandbyMin} daqiqa davomida quvvat ${round(idleKw, 2)}–${round(standbyKw, 2)} kW oralig'ida bo'ldi.`],
    assumptions: ['Uskuna navbatdagi topshiriqni kutayotgan bo‘lishi mumkin.'],
    windowStart: new Date(now.getTime() - windowMs),
    windowEnd: now,
  };
}

/** Barcha qoidalarni ishga tushiradi. NO_DATA bo'lsa, boshqa qoidalar tekshirilmaydi. */
export function runRules(input: InspectorInput): Detection[] {
  const cfg = { ...DEFAULT_INSPECTOR_CONFIG, ...input.config };
  const noData = ruleNoData(input, cfg);
  if (noData) return [noData];
  return [ruleNoProductionSignal, ruleAboveBaseline, ruleSuddenChange, ruleLongStandby]
    .map((rule) => rule(input, cfg))
    .filter((d): d is Detection => d !== null);
}
