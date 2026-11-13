import { useCallback, useEffect, useState } from 'react';
import type { SystemMetrics } from '@shared/ipc';

const INTERVAL_MS = 3000;

export interface BatteryInfo {
  level: number; // 0..1
  charging: boolean;
}

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
}

/**
 * Real tizim ko'rsatkichlari. So'rov 3 soniyada bir marta, faqat oyna ko'rinib turganda
 * va monitoring to'xtatilmagan bo'lsa yuboriladi. Ma'lumot hech qayerga yuborilmaydi.
 */
export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [battery, setBattery] = useState<BatteryInfo | null | 'unsupported'>(() =>
    'getBattery' in navigator ? null : 'unsupported',
  );

  const refresh = useCallback(async () => {
    const result = await window.marius.system.getMetrics();
    if (result.ok) {
      setMetrics(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    tick();
    timer = setInterval(tick, INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [paused, refresh]);

  // Batareya: Chromium'ning Battery Status API (ruxsat talab qilmaydi).
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;
    let manager: BatteryManagerLike | null = null;
    const update = () => manager && setBattery({ level: manager.level, charging: manager.charging });
    nav
      .getBattery()
      .then((m) => {
        manager = m;
        update();
        m.addEventListener('levelchange', update);
        m.addEventListener('chargingchange', update);
      })
      .catch(() => setBattery('unsupported'));
    return () => {
      manager?.removeEventListener('levelchange', update);
      manager?.removeEventListener('chargingchange', update);
    };
  }, []);

  return { metrics, error, paused, setPaused, battery };
}
