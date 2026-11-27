// Demo Data Provider — haqiqiy sensor yo'q paytda vizual va funksional test uchun
// deterministik (takrorlanuvchi) telemetriya yaratadi. Har bir yozuv source=DEMO bilan saqlanadi.
import { energyKwhFromPower } from '@/lib/energy';
import { zonedParts } from '@/lib/time';
import type { ProductionReading, ProviderBatch, ProviderEquipment, SensorDataProvider, TelemetryReading } from './types';

export const DEMO_PROFILES = [
  'shift',
  'continuous',
  'idle_no_signal',
  'above_baseline',
  'offline',
  'surge',
  'long_standby',
  'daylight',
] as const;
export type DemoProfile = (typeof DEMO_PROFILES)[number];

export interface DemoConfig {
  profile: DemoProfile;
  /** offline profili: shu vaqtdan keyin ma'lumot yuborilmaydi */
  offlineSince?: string;
}

export function parseDemoConfig(value: unknown): DemoConfig {
  if (value && typeof value === 'object' && 'profile' in value) {
    const v = value as { profile?: unknown; offlineSince?: unknown };
    if (typeof v.profile === 'string' && (DEMO_PROFILES as readonly string[]).includes(v.profile)) {
      return {
        profile: v.profile as DemoProfile,
        offlineSince: typeof v.offlineSince === 'string' ? v.offlineSince : undefined,
      };
    }
  }
  return { profile: 'shift' };
}

/** Deterministik [0,1) shovqin: bir xil uskuna va vaqt uchun doim bir xil natija. */
export function noise(seed: string, n: number): number {
  let h = 2166136261 ^ n;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

interface Sample {
  powerKw: number | null; // null — ma'lumot yo'q
  producing: boolean | null; // null — signal yuborilmaydi
}

function isWorkTime(hour: number, weekday: number) {
  return weekday !== 0 && hour >= 8 && hour < 20;
}

export function demoSample(eq: ProviderEquipment, at: Date, timeZone: string): Sample {
  const cfg = parseDemoConfig(eq.demoConfig);
  const nominal = eq.nominalPowerKw;
  const baseline = eq.baselinePowerKw ?? nominal * 0.65;
  const minuteIndex = Math.floor(at.getTime() / 60_000);
  const r = noise(eq.id, minuteIndex);
  const jitter = 0.92 + r * 0.16; // ±8%
  const { hour, minute, weekday } = zonedParts(at, timeZone);

  if (eq.simulatedState === 'STOPPED' && eq.simulatedStateAt && at >= eq.simulatedStateAt) {
    return { powerKw: nominal * 0.004, producing: eq.hasProductionSignal ? false : null };
  }

  const signal = (producing: boolean) => (eq.hasProductionSignal ? producing : null);

  switch (cfg.profile) {
    case 'shift': {
      if (!isWorkTime(hour, weekday)) return { powerKw: nominal * 0.01 * jitter, producing: signal(false) };
      if (hour === 12) return { powerKw: nominal * 0.14 * jitter, producing: signal(false) }; // tushlik
      return { powerKw: baseline * jitter, producing: signal(true) };
    }
    case 'continuous': {
      const loaded = minute % 12 < 8;
      return { powerKw: (loaded ? nominal * 0.85 : nominal * 0.35) * jitter, producing: signal(loaded) };
    }
    case 'idle_no_signal': {
      // 5 daqiqalik AI ssenariysi: energiya sarflanadi, ishlab chiqarish signali umuman kelmaydi.
      return { powerKw: nominal * 0.4 * jitter, producing: null };
    }
    case 'above_baseline': {
      return { powerKw: baseline * 1.32 * jitter, producing: signal(true) };
    }
    case 'offline': {
      if (cfg.offlineSince && at >= new Date(cfg.offlineSince)) return { powerKw: null, producing: null };
      if (!isWorkTime(hour, weekday)) return { powerKw: nominal * 0.01 * jitter, producing: signal(false) };
      return { powerKw: baseline * jitter, producing: signal(true) };
    }
    case 'surge': {
      const surging = hour % 3 === 0 && minute < 25;
      return { powerKw: (surging ? nominal * 0.95 : nominal * 0.42) * jitter, producing: signal(true) };
    }
    case 'long_standby': {
      return { powerKw: nominal * 0.12 * jitter, producing: signal(false) };
    }
    case 'daylight': {
      const on = hour >= 7 && hour < 21;
      return { powerKw: (on ? nominal * 0.8 : nominal * 0.08) * jitter, producing: null };
    }
  }
}

/** So'nggi 6 soat — daqiqalik, undan eski — 15 daqiqalik qadam. */
export const FINE_WINDOW_MS = 6 * 3_600_000;
const FINE_STEP = 60_000;
const COARSE_STEP = 15 * 60_000;

export function generateDemoBatch(eq: ProviderEquipment, from: Date, to: Date, timeZone: string): ProviderBatch {
  const telemetry: TelemetryReading[] = [];
  const signals: ProductionReading[] = [];
  const fineStart = to.getTime() - FINE_WINDOW_MS;
  // Qadamlarni soat panjarasiga tekislaymiz — takroriy sinxronizatsiyada bir xil timestamp chiqishi uchun.
  let t = Math.ceil(from.getTime() / FINE_STEP) * FINE_STEP;
  if (t < fineStart) t = Math.ceil(t / COARSE_STEP) * COARSE_STEP;
  const end = Math.floor(to.getTime() / FINE_STEP) * FINE_STEP;
  while (t <= end) {
    const baseStep = t < fineStart ? COARSE_STEP : FINE_STEP;
    let next = t + baseStep;
    if (t < fineStart && next > fineStart) next = Math.ceil(fineStart / FINE_STEP) * FINE_STEP;
    const intervalSeconds = (next - t) / 1000;
    const at = new Date(t);
    const s = demoSample(eq, at, timeZone);
    if (s.powerKw !== null) {
      const powerKw = Math.round(s.powerKw * 1000) / 1000;
      telemetry.push({
        timestamp: at,
        intervalSeconds,
        powerKw,
        energyKwh: Math.round(energyKwhFromPower(powerKw, intervalSeconds) * 10000) / 10000,
      });
      if (s.producing !== null) {
        signals.push({ timestamp: at, isProducing: s.producing, count: s.producing ? Math.max(1, Math.round(intervalSeconds / 60)) : 0 });
      }
    }
    t = next;
  }
  return { telemetry, signals };
}

export const demoDataProvider: SensorDataProvider = {
  id: 'demo',
  name: 'Demo Data Provider',
  source: 'DEMO',
  mode: 'pull',
  implemented: true,
  description:
    "Haqiqiy sensor ulanmaganda simulyatsiya qilingan o'lchovlar. Barcha yozuvlar \"Demo ma'lumot\" deb belgilanadi.",
  pull: generateDemoBatch,
};
