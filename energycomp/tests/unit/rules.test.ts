import { describe, expect, it } from 'vitest';
import { runRules, ruleNoProductionSignal, DEFAULT_INSPECTOR_CONFIG, type InspectorInput } from '@/server/inspector/rules';

const now = new Date('2026-01-01T12:00:00Z');
const MIN = 60_000;

function minutes(n: number, powerKw: (i: number) => number) {
  return Array.from({ length: n }, (_, i) => ({ timestamp: new Date(now.getTime() - (n - 1 - i) * MIN), powerKw: powerKw(i), intervalSeconds: 60 }));
}

function input(over: Partial<InspectorInput> = {}, eq: Partial<InspectorInput['equipment']> = {}): InspectorInput {
  return {
    now,
    equipment: {
      id: 'e1',
      name: 'CNC-1',
      nominalPowerKw: 20,
      baselinePowerKw: null,
      idleThresholdKw: null,
      standbyThresholdKw: null,
      hasProductionSignal: true,
      lastSeenAt: now,
      ...eq,
    },
    telemetry: minutes(90, () => 10),
    signals: [],
    historicalBaselineKw: null,
    ...over,
  };
}

describe('5 daqiqalik qoida: sarf bor, ishlab chiqarish signali yo‘q', () => {
  it('signal manbasi bor, signal kelmagan — "signal kelmadi" deb yozadi (fakt sifatida "ishlab chiqarmayapti" demaydi)', () => {
    const d = ruleNoProductionSignal(input(), DEFAULT_INSPECTOR_CONFIG)!;
    expect(d).not.toBeNull();
    expect(d.title).toContain('ishlab chiqarish signali kelmadi');
    expect(d.confidence).toBe('MEDIUM');
    expect(d.facts.join(' ')).not.toMatch(/ishlab chiqarmayapti/);
    expect(d.assumptions.join(' ')).toMatch(/taxmin/);
    expect(d.recommendation).toMatch(/Xavfsiz bo'lsa, uskunani to'xtatishni ko'rib chiqing/);
    expect(d.evidence.find((e) => e.unit === 'kWh')!.value).toBeCloseTo(5 * (10 / 60), 2);
  });
  it('signal manbasi yo‘q — xulosa chiqarilmaydi', () => {
    expect(ruleNoProductionSignal(input({}, { hasProductionSignal: false }), DEFAULT_INSPECTOR_CONFIG)).toBeNull();
  });
  it('ishlab chiqarish signali kelgan — alert yo‘q', () => {
    const signals = [{ timestamp: new Date(now.getTime() - 2 * MIN), isProducing: true }];
    expect(ruleNoProductionSignal(input({ signals }), DEFAULT_INSPECTOR_CONFIG)).toBeNull();
  });
  it('signal "ishlab chiqarmayapti" — yuqori ishonchlilik', () => {
    const signals = [{ timestamp: new Date(now.getTime() - 2 * MIN), isProducing: false }];
    expect(ruleNoProductionSignal(input({ signals }), DEFAULT_INSPECTOR_CONFIG)!.confidence).toBe('HIGH');
  });
  it('quvvat kutish chegarasidan past — bu qoida ishlamaydi', () => {
    expect(ruleNoProductionSignal(input({ telemetry: minutes(90, () => 2) }), DEFAULT_INSPECTOR_CONFIG)).toBeNull();
  });
  it('5 daqiqadan kam ma’lumot — xulosa yo‘q', () => {
    expect(ruleNoProductionSignal(input({ telemetry: minutes(2, () => 10) }), DEFAULT_INSPECTOR_CONFIG)).toBeNull();
  });
});

describe('boshqa qoidalar', () => {
  it('ma’lumot kelmayapti — faqat NO_DATA qaytadi', () => {
    const res = runRules(input({}, { lastSeenAt: new Date(now.getTime() - 30 * MIN) }));
    expect(res.map((r) => r.rule)).toEqual(['NO_DATA']);
    expect(res[0]!.severity).toBe('WARNING');
    expect(runRules(input({}, { lastSeenAt: new Date(now.getTime() - 90 * MIN) }))[0]!.severity).toBe('CRITICAL');
  });
  it('baseline’dan yuqori quvvat', () => {
    const res = runRules(input({ telemetry: minutes(90, () => 16) }, { baselinePowerKw: 10, hasProductionSignal: false }));
    const d = res.find((r) => r.rule === 'ABOVE_BASELINE')!;
    expect(d.severity).toBe('CRITICAL'); // 1.6×
    expect(d.confidence).toBe('HIGH');
  });
  it('baseline yo‘q bo‘lsa tarixiy baseline ishlatiladi (o‘rta ishonchlilik)', () => {
    const res = runRules(input({ telemetry: minutes(90, () => 13), historicalBaselineKw: 10 }, { hasProductionSignal: false }));
    expect(res.find((r) => r.rule === 'ABOVE_BASELINE')?.confidence).toBe('MEDIUM');
  });
  it('keskin o‘sish', () => {
    const tel = minutes(80, (i) => (i >= 70 ? 18 : 7));
    expect(runRules(input({ telemetry: tel }, { hasProductionSignal: false })).some((r) => r.rule === 'SUDDEN_CHANGE')).toBe(true);
  });
  it('uzoq kutish rejimi', () => {
    const res = runRules(input({ telemetry: minutes(90, () => 2) }, { hasProductionSignal: false }));
    expect(res.map((r) => r.rule)).toContain('LONG_STANDBY');
  });
  it('normal ishlash — alert yo‘q', () => {
    const signals = [{ timestamp: new Date(now.getTime() - MIN), isProducing: true }];
    expect(runRules(input({ signals }, { baselinePowerKw: 10 }))).toEqual([]);
  });
});
