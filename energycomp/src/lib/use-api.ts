'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api-client';

/**
 * GET so'rov uchun hook. url o'zgarsa eski so'rov bekor qilinadi (poyga holati yo'q).
 * url = null — so'rov yuborilmaydi. reload() — qayta yuklash.
 */
export function useApiData<T>(url: string | null) {
  const [tick, setTick] = useState(0);
  const key = url ? `${url}#${tick}` : null;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });

  useEffect(() => {
    if (!url || !key) return;
    const ctrl = new AbortController();
    api<T>(url, { signal: ctrl.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setState((s) => ({ key, data: s.data, error: errorMessage(e) }));
      });
    return () => ctrl.abort();
  }, [url, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = key !== null && state.key !== key;
  return {
    /** Oxirgi muvaffaqiyatli javob (yangi so'rov davomida eski ma'lumot ko'rinib turadi) */
    data: url ? state.data : null,
    error: state.key === key ? state.error : null,
    loading,
    reload,
    setData: (updater: (d: T | null) => T | null) => setState((s) => ({ ...s, data: updater(s.data) })),
  };
}

/** Sahifa ko'rinib turganda vaqti-vaqti bilan chaqiradi. */
export function useInterval(fn: () => void, ms: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') fn();
    }, ms);
    return () => clearInterval(t);
  }, [fn, ms, enabled]);
}
