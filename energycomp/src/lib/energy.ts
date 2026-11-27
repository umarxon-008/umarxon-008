// Quvvat (kW) va energiya (kWh) hisob-kitoblari.
// kW — lahzalik quvvat; kWh — vaqt davomida iste'mol qilingan energiya. Ularni aralashtirmang.

/** Berilgan o'rtacha quvvat (kW) bilan `seconds` davomida iste'mol qilingan energiya (kWh). */
export function energyKwhFromPower(powerKw: number, seconds: number): number {
  if (!Number.isFinite(powerKw) || !Number.isFinite(seconds) || powerKw < 0 || seconds <= 0) return 0;
  return (powerKw * seconds) / 3600;
}

/** Davrdagi energiyadan o'rtacha quvvat (kW). */
export function averagePowerKw(energyKwh: number, hours: number): number {
  if (hours <= 0 || !Number.isFinite(energyKwh)) return 0;
  return energyKwh / hours;
}

export function costFor(energyKwh: number, pricePerKwh: number): number {
  if (!Number.isFinite(energyKwh) || !Number.isFinite(pricePerKwh)) return 0;
  return energyKwh * pricePerKwh;
}

export interface TariffPoint {
  pricePerKwh: number;
  validFrom: Date;
}

/** Berilgan lahzada amal qiladigan tarif (validFrom <= at bo'lgan eng oxirgisi). */
export function tariffAt(tariffs: TariffPoint[], at: Date): TariffPoint | null {
  let best: TariffPoint | null = null;
  for (const t of tariffs) {
    if (t.validFrom.getTime() <= at.getTime() && (!best || t.validFrom > best.validFrom)) best = t;
  }
  // Agar barcha tariflar keyinroq boshlangan bo'lsa, eng birinchisini ishlatamiz (taxminiy).
  if (!best && tariffs.length > 0) {
    best = tariffs.reduce((a, b) => (a.validFrom < b.validFrom ? a : b));
  }
  return best;
}

/** Bucketlar bo'yicha xarajat: har bir bucket o'z vaqtidagi tarif bilan. */
export function costForBuckets(
  buckets: { bucket: Date; energyKwh: number }[],
  tariffs: TariffPoint[],
): number {
  let total = 0;
  for (const b of buckets) {
    const t = tariffAt(tariffs, b.bucket);
    if (t) total += costFor(b.energyKwh, t.pricePerKwh);
  }
  return total;
}

export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Taxminiy tejash: baseline davrining kunlik o'rtacha iste'moli x joriy davr kunlari − haqiqiy iste'mol.
 * Ishlab chiqarish hajmi va ob-havo hisobga olinmaydi — shuning uchun natija "taxminiy".
 */
export function estimateSavingsKwh(params: {
  baselineEnergyKwh: number;
  baselineDays: number;
  currentEnergyKwh: number;
  currentDays: number;
}): number | null {
  const { baselineEnergyKwh, baselineDays, currentEnergyKwh, currentDays } = params;
  if (baselineDays <= 0 || currentDays <= 0 || baselineEnergyKwh <= 0) return null;
  const expected = (baselineEnergyKwh / baselineDays) * currentDays;
  return expected - currentEnergyKwh;
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
