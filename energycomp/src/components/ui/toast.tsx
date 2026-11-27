'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };
const Ctx = createContext<{ push: (kind: Toast['kind'], message: string) => void }>({ push: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border bg-white px-4 py-3 text-sm shadow-pop',
              t.kind === 'error' ? 'border-[#f6c9cb]' : 'border-line',
            )}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            {t.kind === 'error' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-energy" aria-hidden />
            )}
            <span className="flex-1 text-navy">{t.message}</span>
            <button type="button" aria-label="Yopish" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X className="h-4 w-4 text-muted" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
