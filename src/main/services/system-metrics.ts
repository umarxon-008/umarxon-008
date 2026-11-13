import { statfsSync } from 'node:fs';
import os from 'node:os';
import type { SystemMetrics } from '@shared/ipc';

export interface CpuTimes {
  idle: number;
  total: number;
}

/** Barcha yadrolar bo'yicha umumiy CPU vaqtlari (ms). */
export function readCpuTimes(cpus: os.CpuInfo[] = os.cpus()): CpuTimes {
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

/** Ikki o'lchov orasidagi CPU yuklanishi (0–100). O'lchov yetarli bo'lmasa null qaytaradi. */
export function cpuUsagePercent(prev: CpuTimes, next: CpuTimes): number | null {
  const total = next.total - prev.total;
  const idle = next.idle - prev.idle;
  if (total <= 0) return null;
  return clampPercent(((total - idle) / total) * 100);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** Tizim diski: Windows'da odatda C:\, boshqa tizimlarda "/". */
export function systemDiskRoot(platform: NodeJS.Platform = process.platform, env = process.env): string {
  if (platform === 'win32') return `${env['SystemDrive'] ?? 'C:'}\\`;
  return '/';
}

/** Windows'da "Windows 11 Pro" kabi nom; boshqa tizimlarda umumiy nom (Linux, macOS). */
export function osDisplayName(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') return os.version() || 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return os.type();
}

export function readDisk(root: string): SystemMetrics['disk'] {
  try {
    const s = statfsSync(root);
    const totalBytes = s.blocks * s.bsize;
    const freeBytes = s.bavail * s.bsize;
    if (totalBytes <= 0) return null;
    const usedBytes = totalBytes - freeBytes;
    return { path: root, totalBytes, usedBytes, percent: clampPercent((usedBytes / totalBytes) * 100) };
  } catch {
    return null;
  }
}

/**
 * Real tizim ko'rsatkichlari. Polling yo'q: faqat renderer so'raganda o'qiladi.
 * Hech qanday ma'lumot tashqariga yuborilmaydi.
 */
export function createSystemMetricsService(deps: { isOnline: () => boolean }) {
  let previousCpu = readCpuTimes();

  return {
    collect(): SystemMetrics {
      const currentCpu = readCpuTimes();
      const cpu = cpuUsagePercent(previousCpu, currentCpu);
      previousCpu = currentCpu;

      const totalMem = os.totalmem();
      const usedMem = totalMem - os.freemem();

      return {
        cpu: { percent: cpu, cores: os.cpus().length },
        memory: {
          totalBytes: totalMem,
          usedBytes: usedMem,
          percent: clampPercent((usedMem / totalMem) * 100),
        },
        disk: readDisk(systemDiskRoot()),
        online: deps.isOnline(),
        os: {
          name: osDisplayName(),
          release: os.release(),
          uptimeSeconds: Math.round(os.uptime()),
        },
        sampledAt: new Date().toISOString(),
      };
    },
  };
}
