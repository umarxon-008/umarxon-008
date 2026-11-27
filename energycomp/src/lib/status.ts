import type { EquipmentStatusName } from './labels';

export const OFFLINE_AFTER_MS = 5 * 60_000;

export interface Thresholds {
  idleKw: number;
  standbyKw: number;
}

/** Chegaralar berilmagan bo'lsa nominal quvvatdan kelib chiqib standart qiymatlar. */
export function resolveThresholds(e: {
  nominalPowerKw: number;
  idleThresholdKw?: number | null;
  standbyThresholdKw?: number | null;
}): Thresholds {
  const idleKw = e.idleThresholdKw ?? e.nominalPowerKw * 0.03;
  const standbyKw = Math.max(idleKw, e.standbyThresholdKw ?? e.nominalPowerKw * 0.2);
  return { idleKw, standbyKw };
}

export function deriveStatus(params: {
  now: Date;
  lastSeenAt: Date | null;
  currentPowerKw: number;
  thresholds: Thresholds;
  hasActiveWarning: boolean;
}): EquipmentStatusName {
  const { now, lastSeenAt, currentPowerKw, thresholds, hasActiveWarning } = params;
  if (!lastSeenAt || now.getTime() - lastSeenAt.getTime() > OFFLINE_AFTER_MS) return 'OFFLINE';
  if (hasActiveWarning) return 'WARNING';
  if (currentPowerKw < thresholds.idleKw) return 'STOPPED';
  if (currentPowerKw < thresholds.standbyKw) return 'STANDBY';
  return 'RUNNING';
}
