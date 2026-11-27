import { describe, expect, it } from 'vitest';
import { deriveStatus, resolveThresholds } from '@/lib/status';
import { can, PERMISSIONS } from '@/lib/permissions';

describe('uskuna holati', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const th = resolveThresholds({ nominalPowerKw: 100 });
  it('standart chegaralar: 3% va 20%', () => {
    expect(th).toEqual({ idleKw: 3, standbyKw: 20 });
  });
  it('holatlar quvvat va aloqaga qarab', () => {
    const recent = new Date(now.getTime() - 60_000);
    expect(deriveStatus({ now, lastSeenAt: recent, currentPowerKw: 50, thresholds: th, hasActiveWarning: false })).toBe('RUNNING');
    expect(deriveStatus({ now, lastSeenAt: recent, currentPowerKw: 10, thresholds: th, hasActiveWarning: false })).toBe('STANDBY');
    expect(deriveStatus({ now, lastSeenAt: recent, currentPowerKw: 1, thresholds: th, hasActiveWarning: false })).toBe('STOPPED');
    expect(deriveStatus({ now, lastSeenAt: recent, currentPowerKw: 50, thresholds: th, hasActiveWarning: true })).toBe('WARNING');
    expect(deriveStatus({ now, lastSeenAt: new Date(now.getTime() - 10 * 60_000), currentPowerKw: 50, thresholds: th, hasActiveWarning: true })).toBe('OFFLINE');
    expect(deriveStatus({ now, lastSeenAt: null, currentPowerKw: 0, thresholds: th, hasActiveWarning: false })).toBe('OFFLINE');
  });
});

describe('rollar va ruxsatlar', () => {
  it('Viewer faqat ko‘radi', () => {
    expect(can('VIEWER', 'org.view')).toBe(true);
    expect(can('VIEWER', 'equipment.write')).toBe(false);
    expect(can('VIEWER', 'alert.update')).toBe(false);
    expect(can('VIEWER', 'control.request')).toBe(false);
  });
  it('Engineer uskuna va xaritani boshqaradi, lekin foydalanuvchilarni emas', () => {
    expect(can('ENGINEER', 'equipment.write')).toBe(true);
    expect(can('ENGINEER', 'map.write')).toBe(true);
    expect(can('ENGINEER', 'users.manage')).toBe(false);
    expect(can('ENGINEER', 'control.review')).toBe(false);
  });
  it('Manager tasdiqlaydi, Owner hammasini qiladi', () => {
    expect(can('MANAGER', 'control.review')).toBe(true);
    expect(can('MANAGER', 'billing.manage')).toBe(false);
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) expect(can('OWNER', p)).toBe(true);
    expect(can(null, 'org.view')).toBe(false);
  });
});
