import { describe, expect, it } from 'vitest';
import { averagePowerKw, costForBuckets, energyKwhFromPower, estimateSavingsKwh, percentChange, tariffAt } from '@/lib/energy';

describe('kW / kWh hisob-kitoblari', () => {
  it('quvvat × vaqt = energiya (kW → kWh)', () => {
    expect(energyKwhFromPower(10, 3600)).toBe(10); // 10 kW, 1 soat = 10 kWh
    expect(energyKwhFromPower(12, 60)).toBeCloseTo(0.2, 10); // 12 kW, 1 daqiqa = 0.2 kWh
    expect(energyKwhFromPower(30, 900)).toBeCloseTo(7.5, 10); // 30 kW, 15 daqiqa
  });
  it('noto‘g‘ri qiymatlar energiyani 0 qiladi', () => {
    expect(energyKwhFromPower(-5, 60)).toBe(0);
    expect(energyKwhFromPower(5, 0)).toBe(0);
    expect(energyKwhFromPower(Number.NaN, 60)).toBe(0);
  });
  it('energiya ÷ soat = o‘rtacha quvvat (kWh → kW)', () => {
    expect(averagePowerKw(240, 24)).toBe(10);
    expect(averagePowerKw(10, 0)).toBe(0);
  });
  it('xarajat davrdagi amaldagi tarif bilan hisoblanadi', () => {
    const tariffs = [
      { pricePerKwh: 1000, validFrom: new Date('2026-01-01T00:00:00Z') },
      { pricePerKwh: 1200, validFrom: new Date('2026-06-01T00:00:00Z') },
    ];
    expect(tariffAt(tariffs, new Date('2026-03-01'))?.pricePerKwh).toBe(1000);
    expect(tariffAt(tariffs, new Date('2026-07-01'))?.pricePerKwh).toBe(1200);
    const cost = costForBuckets(
      [
        { bucket: new Date('2026-05-31T00:00:00Z'), energyKwh: 10 },
        { bucket: new Date('2026-06-02T00:00:00Z'), energyKwh: 10 },
      ],
      tariffs,
    );
    expect(cost).toBe(10 * 1000 + 10 * 1200);
  });
  it('foiz o‘zgarishi va baseline asosidagi taxminiy tejash', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(5, 0)).toBeNull();
    expect(estimateSavingsKwh({ baselineEnergyKwh: 700, baselineDays: 7, currentEnergyKwh: 1300, currentDays: 14 })).toBe(100);
    expect(estimateSavingsKwh({ baselineEnergyKwh: 0, baselineDays: 7, currentEnergyKwh: 10, currentDays: 1 })).toBeNull();
  });
});
