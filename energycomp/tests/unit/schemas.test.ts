import { describe, expect, it } from 'vitest';
import { registerSchema } from '@/schemas/auth';
import { equipmentInputSchema } from '@/schemas/equipment';
import { ingestSchema } from '@/schemas/telemetry';

describe('validatsiya sxemalari', () => {
  const reg = { name: 'Ali Valiyev', email: 'ALI@Example.uz ', password: 'Parol123', confirmPassword: 'Parol123', organizationName: 'Zavod', industry: 'Boshqa', acceptTerms: true };
  it('ro‘yxatdan o‘tish: email normallashtiriladi', () => {
    const r = registerSchema.parse(reg);
    expect(r.email).toBe('ali@example.uz');
  });
  it('ro‘yxatdan o‘tish: zaif parol, mos kelmagan tasdiq va rozilik yo‘qligi rad etiladi', () => {
    expect(registerSchema.safeParse({ ...reg, password: 'short', confirmPassword: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, confirmPassword: 'Boshqa123' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...reg, acceptTerms: false }).success).toBe(false);
  });
  it('uskuna: chegaralar mantiqiy bo‘lishi kerak', () => {
    const ok = equipmentInputSchema.parse({ name: 'Press', code: 'PRS-1', factoryId: 'f', nominalPowerKw: 30, standbyThresholdKw: 5, idleThresholdKw: 1 });
    expect(ok.baselinePowerKw).toBeNull();
    expect(equipmentInputSchema.safeParse({ name: 'Press', code: 'PRS 1', factoryId: 'f', nominalPowerKw: 30 }).success).toBe(false);
    expect(equipmentInputSchema.safeParse({ name: 'Press', code: 'P', factoryId: 'f', nominalPowerKw: 30, standbyThresholdKw: 50 }).success).toBe(false);
    expect(equipmentInputSchema.safeParse({ name: 'Press', code: 'P', factoryId: 'f', nominalPowerKw: Number.NaN }).success).toBe(false);
  });
  it('ingest: timestamp ISO 8601 bo‘lishi shart', () => {
    expect(ingestSchema.safeParse({ readings: [{ sensorId: 's', timestamp: '2026-01-01T10:00:00+05:00', powerKw: 1 }] }).success).toBe(true);
    expect(ingestSchema.safeParse({ readings: [{ sensorId: 's', timestamp: 'kecha', powerKw: 1 }] }).success).toBe(false);
  });
});
