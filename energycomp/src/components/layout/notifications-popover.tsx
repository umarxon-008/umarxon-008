'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ShieldAlert, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  type: 'ALERT' | 'CONTROL' | 'SYSTEM';
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Header'dagi qo'ng'iroqcha: bosilganda bildirishnomalar ro'yxati shu yerda ochiladi. */
export function NotificationsPopover({ open, onToggle, onClose, unread }: { open: boolean; onToggle: () => void; onClose: () => void; unread: number }) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const { data, reload } = useApiData<{ items: Item[]; unread: number }>(open ? '/api/notifications?page=1' : null);
  const count = data?.unread ?? unread;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function openItem(n: Item) {
    if (!n.readAt) await api(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => undefined);
    onClose();
    if (n.link) router.push(n.link);
    router.refresh();
  }

  async function markAll() {
    await api('/api/notifications/read-all', { method: 'POST' }).catch(() => undefined);
    reload();
    router.refresh();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative rounded-xl p-2 text-navy hover:bg-brand-50"
        aria-label={`Bildirishnomalar: ${count} ta o‘qilmagan`}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-white" aria-hidden>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Bildirishnomalar" className="fixed inset-x-3 top-16 z-40 rounded-2xl border border-line bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold text-navy">Bildirishnomalar</p>
            <button type="button" onClick={markAll} disabled={!count} className="inline-flex items-center gap-1 text-xs font-semibold text-brand disabled:text-muted">
              <CheckCheck className="h-4 w-4" aria-hidden /> Barchasini o‘qildi
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {!data ? (
              <li className="px-4 py-6 text-center text-sm text-muted">Yuklanmoqda...</li>
            ) : data.items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">Bildirishnoma yo‘q</li>
            ) : (
              data.items.slice(0, 15).map((n) => {
                const Icon = n.type === 'ALERT' ? TriangleAlert : n.type === 'CONTROL' ? ShieldAlert : Bell;
                return (
                  <li key={n.id} className="border-b border-line/60 last:border-0">
                    <button type="button" onClick={() => openItem(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-surface', !n.readAt && 'bg-brand-50/60')}>
                      <span className={cn('mt-0.5 h-fit rounded-lg p-1.5', n.type === 'ALERT' ? 'bg-orange-50 text-orange' : 'bg-brand-50 text-brand')}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm text-navy', !n.readAt && 'font-semibold')}>{n.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">{formatRelative(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="O‘qilmagan" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <Link href="/app/notifications" onClick={onClose} className="block border-t border-line px-4 py-2.5 text-center text-sm font-semibold text-brand hover:bg-surface">
            Barchasini ko‘rish
          </Link>
        </div>
      )}
    </div>
  );
}
