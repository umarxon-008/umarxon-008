import { describe, expect, it } from 'vitest';
import {
  clampPercent,
  cpuUsagePercent,
  createSystemMetricsService,
  readCpuTimes,
  systemDiskRoot,
} from '../../src/main/services/system-metrics';
import { SystemMetricsSchema } from '@shared/ipc';

describe('CPU hisoblash', () => {
  it('ikki o‘lchov orasidagi yuklanishni hisoblaydi', () => {
    expect(cpuUsagePercent({ idle: 100, total: 200 }, { idle: 150, total: 300 })).toBe(50);
    expect(cpuUsagePercent({ idle: 0, total: 0 }, { idle: 0, total: 100 })).toBe(100);
  });

  it('vaqt o‘tmagan bo‘lsa null qaytaradi (soxta 0% ko‘rsatmaydi)', () => {
    expect(cpuUsagePercent({ idle: 1, total: 10 }, { idle: 1, total: 10 })).toBeNull();
  });

  it('yadrolar vaqtini jamlaydi', () => {
    const cpu = (user: number, idle: number) => ({
      model: 'x',
      speed: 1,
      times: { user, nice: 0, sys: 0, idle, irq: 0 },
    });
    expect(readCpuTimes([cpu(10, 90), cpu(30, 70)])).toEqual({ idle: 160, total: 200 });
  });

  it('foizni 0–100 oralig‘ida saqlaydi', () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(41.6)).toBe(42);
  });
});

describe('tizim diski', () => {
  it('Windows’da SystemDrive ishlatiladi', () => {
    expect(systemDiskRoot('win32', { SystemDrive: 'D:' })).toBe('D:\\');
    expect(systemDiskRoot('win32', {})).toBe('C:\\');
    expect(systemDiskRoot('linux', {})).toBe('/');
  });
});

describe('createSystemMetricsService', () => {
  it('real tizimdan sxemaga mos ma’lumot qaytaradi', () => {
    const service = createSystemMetricsService({ isOnline: () => false });
    const m = service.collect();
    expect(SystemMetricsSchema.safeParse(m).success).toBe(true);
    expect(m.online).toBe(false);
    expect(m.memory.totalBytes).toBeGreaterThan(0);
    expect(m.cpu.cores).toBeGreaterThan(0);
  });
});
