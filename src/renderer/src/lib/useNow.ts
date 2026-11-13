import { useEffect, useState } from 'react';

/** Joriy vaqt: render paytida Date.now() chaqirmaslik uchun, har daqiqada yangilanadi */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
