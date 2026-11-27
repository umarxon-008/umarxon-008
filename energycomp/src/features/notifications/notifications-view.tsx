'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { api } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatDateTime } from '@/lib/format';
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

export function NotificationsView({ timezone }: { timezone: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const { data, error, reload: load } = useApiData<{ items: Item[]; total: number; unread: number; pageSize: number }>(
    `/api/notifications?page=${page}${filter === 'unread' ? '&unread=1' : ''}`,
  );

  async function markAll() {
    await api('/api/notifications/read-all', { method: 'POST' });
    void load();
    router.refresh();
  }
  async function open(n: Item) {
    if (!n.readAt) await api(`/api/notifications/${n.id}`, { method: 'PATCH' }).catch(() => undefined);
    if (n.link) router.push(n.link);
    else void load();
    router.refresh();
  }

  const Icon = (t: Item['type']) => (t === 'ALERT' ? TriangleAlert : t === 'CONTROL' ? ShieldAlert : Bell);
  return (
    <div>
      <PageHeader
        title="Bildirishnomalar"
        description={data ? `${data.unread} ta o‘qilmagan` : undefined}
        actions={
          <>
            <Segmented label="Filtr" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={[{ value: 'all', label: 'Barchasi' }, { value: 'unread', label: 'O‘qilmagan' }]} />
            <Button variant="outline" onClick={markAll} disabled={!data?.unread}>
              <CheckCheck className="h-4 w-4" aria-hidden /> Barchasini o‘qilgan qilish
            </Button>
          </>
        }
      />
      <Card>
        {error ? (
          <ErrorState message={error} />
        ) : !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState title="Bildirishnoma yo‘q" />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {data.items.map((n) => {
                const I = Icon(n.type);
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-surface', !n.readAt && 'bg-brand-50/50')}>
                      <span className={cn('mt-0.5 rounded-lg p-2', n.type === 'ALERT' ? 'bg-orange-50 text-orange' : n.type === 'CONTROL' ? 'bg-amber-50 text-[#9a6b00]' : 'bg-brand-50 text-brand')}>
                        <I className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn('text-sm text-navy', !n.readAt && 'font-semibold')}>{n.title}</span>
                          <span className="shrink-0 text-xs text-muted">{formatDateTime(n.createdAt, timezone)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.body}</span>
                      </span>
                      {!n.readAt && <span className="sr-only">O‘qilmagan</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-4"><Pagination page={page} pageSize={data.pageSize} total={data.total} onChange={setPage} /></div>
          </>
        )}
      </Card>
    </div>
  );
}
