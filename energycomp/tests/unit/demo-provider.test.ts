import { describe, expect, it } from 'vitest';
import { generateDemoBatch, noise, parseDemoConfig } from '@/server/providers/sensor/demo';
import type { ProviderEquipment } from '@/server/providers/sensor/types';

const base: ProviderEquipment = {
  id: 'eq-1',
  nominalPowerKw: 20,
  baselinePowerKw: 12,
  hasProductionSignal: true,
  sensorId: null,
  demoConfig: { profile: 'shift' },
  simulatedState: null,
  simulatedStateAt: null,
};
const to = new Date('2026-01-05T06:00:00Z'); // dushanba 11:00 Toshkent

describe('Demo Data Provider', () => {
  it('deterministik: bir xil kirish — bir xil natija', () => {
    expect(noise('a', 1)).toBe(noise('a', 1));
    const a = generateDemoBatch(base, new Date(to.getTime() - 3600_000), to, 'Asia/Tashkent');
    const b = generateDemoBatch(base, new Date(to.getTime() - 3600_000), to, 'Asia/Tashkent');
    expect(a).toEqual(b);
  });
  it('energiya = quvvat × interval va intervallar bir-birini qoplamaydi', () => {
    const from = new Date(to.getTime() - 24 * 3600_000);
    const { telemetry } = generateDemoBatch(base, from, to, 'Asia/Tashkent');
    for (const r of telemetry) expect(r.energyKwh).toBeCloseTo((r.powerKw * r.intervalSeconds) / 3600, 3);
    for (let i = 1; i < telemetry.length; i++) {
      const prev = telemetry[i - 1]!;
      expect(prev.timestamp.getTime() + prev.intervalSeconds * 1000).toBe(telemetry[i]!.timestamp.getTime());
    }
    // so'nggi 6 soat — daqiqalik
    expect(telemetry.at(-1)!.intervalSeconds).toBe(60);
    expect(telemetry[0]!.intervalSeconds).toBe(900);
  });
  it('5 daqiqalik ssenariy: sarf bor, signal umuman yo‘q', () => {
    const eq = { ...base, demoConfig: { profile: 'idle_no_signal' } };
    const { telemetry, signals } = generateDemoBatch(eq, new Date(to.getTime() - 600_000), to, 'Asia/Tashkent');
    expect(telemetry.length).toBeGreaterThan(5);
    expect(telemetry.every((t) => t.powerKw > 6)).toBe(true);
    expect(signals).toHaveLength(0);
  });
  it('offline profili: belgilangan vaqtdan keyin o‘lchov yo‘q', () => {
    const offlineSince = new Date(to.getTime() - 30 * 60_000).toISOString();
    const eq = { ...base, demoConfig: { profile: 'offline', offlineSince } };
    const { telemetry } = generateDemoBatch(eq, new Date(to.getTime() - 3600_000), to, 'Asia/Tashkent');
    expect(telemetry.every((t) => t.timestamp < new Date(offlineSince))).toBe(true);
  });
  it('simulyatsiyada to‘xtatilgan uskuna deyarli quvvat iste’mol qilmaydi', () => {
    const eq = { ...base, simulatedState: 'STOPPED', simulatedStateAt: new Date(to.getTime() - 600_000) };
    const { telemetry } = generateDemoBatch(eq, new Date(to.getTime() - 300_000), to, 'Asia/Tashkent');
    expect(telemetry.every((t) => t.powerKw < 0.2)).toBe(true);
  });
  it('noto‘g‘ri demo sozlamasi standart profilga qaytadi', () => {
    expect(parseDemoConfig({ profile: 'nope' }).profile).toBe('shift');
    expect(parseDemoConfig(null).profile).toBe('shift');
  });
});
