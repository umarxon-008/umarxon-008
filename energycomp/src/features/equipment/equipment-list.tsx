'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { SourceBadge, StatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { formatKw, formatRelative } from '@/lib/format';
import { STATUS_LABELS, type EquipmentStatusName } from '@/lib/labels';
import { EquipmentFormModal, type EquipmentFormValues } from './equipment-form';

type SortKey = 'name' | 'power' | 'status' | 'code';

function SortBtn({ s, current, onSort, children }: { s: SortKey; current: SortKey; onSort: (s: SortKey) => void; children: string }) {
  return (
    <button type="button" onClick={() => onSort(s)} className="inline-flex items-center gap-1 font-semibold hover:text-navy" aria-label={`${children} bo‘yicha saralash`}>
      {children}
      <ArrowDownUp className={`h-3 w-3 ${current === s ? 'text-brand' : ''}`} aria-hidden />
    </button>
  );
}

interface Row extends EquipmentFormValues {
  id: string;
  status: EquipmentStatusName;
  currentPowerKw: number;
  lastSeenAt: string | null;
  factory: { id: string; name: string };
  category: { id: string; name: string } | null;
}

export function EquipmentList({
  factories,
  categories,
  canWrite,
  limit,
}: {
  factories: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  canWrite: boolean;
  limit: { used: number; max: number };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [q, setQ] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'name' | 'power' | 'status' | 'code'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Row[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(params.get('new') === '1' && canWrite);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const sp = new URLSearchParams({ sort, order, page: String(page), pageSize: '20' });
    if (q.trim()) sp.set('q', q.trim());
    if (factoryId) sp.set('factoryId', factoryId);
    if (status) sp.set('status', status);
    try {
      setData(await api(`/api/equipment?${sp}`));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [q, factoryId, status, sort, order, page]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function toggleSort(s: typeof sort) {
    if (sort === s) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(s);
      setOrder(s === 'power' ? 'desc' : 'asc');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/equipment/${deleting.id}`, { method: 'DELETE' });
      push('success', `"${deleting.name}" o‘chirildi`);
      setDeleting(null);
      void load();
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const sortProps = { current: sort, onSort: toggleSort };

  return (
    <div>
      <PageHeader
        title="Uskunalar"
        description={`${limit.used} / ${limit.max} ta uskuna (tarif limiti)`}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              disabled={limit.used >= limit.max}
              title={limit.used >= limit.max ? 'Tarif limiti to‘lgan' : undefined}
            >
              <Plus className="h-4 w-4" aria-hidden /> Uskuna qo‘shish
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <label className="sr-only" htmlFor="eq-q">Qidirish</label>
          <Input id="eq-q" placeholder="Nomi, kodi yoki joylashuvi..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="sm:max-w-xs" />
          <label className="sr-only" htmlFor="eq-f">Zavod</label>
          <Select id="eq-f" value={factoryId} onChange={(e) => { setFactoryId(e.target.value); setPage(1); }} className="sm:max-w-[220px]">
            <option value="">Barcha zavodlar</option>
            {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <label className="sr-only" htmlFor="eq-s">Holat</label>
          <Select id="eq-s" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:max-w-[200px]">
            <option value="">Barcha holatlar</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        {error ? (
          <ErrorState message={error} action={<Button onClick={load}>Qayta urinish</Button>} />
        ) : !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState
            title={q || factoryId || status ? 'Filtr bo‘yicha uskuna topilmadi' : 'Hali uskuna yo‘q'}
            description={canWrite ? 'Uskuna qo‘shib, uning energiya sarfini kuzatishni boshlang.' : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3"><SortBtn {...sortProps} s="name">Uskuna</SortBtn></th>
                    <th scope="col" className="px-4 py-3"><SortBtn {...sortProps} s="code">Kod</SortBtn></th>
                    <th scope="col" className="px-4 py-3">Zavod / joylashuv</th>
                    <th scope="col" className="px-4 py-3"><SortBtn {...sortProps} s="status">Holat</SortBtn></th>
                    <th scope="col" className="px-4 py-3 text-right"><SortBtn {...sortProps} s="power">Joriy quvvat</SortBtn></th>
                    <th scope="col" className="px-4 py-3">Manba</th>
                    <th scope="col" className="px-4 py-3">Oxirgi aloqa</th>
                    {canWrite && <th scope="col" className="px-4 py-3"><span className="sr-only">Amallar</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((e) => (
                    <tr key={e.id} className="hover:bg-surface/60">
                      <td className="px-4 py-3">
                        <Link href={`/app/equipment/${e.id}`} className="font-semibold text-navy hover:text-brand">{e.name}</Link>
                        <p className="text-xs text-muted">{e.category?.name ?? 'Kategoriyasiz'} · {e.nominalPowerKw} kW nominal</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-navy">{e.code}</td>
                      <td className="px-4 py-3 text-muted">{e.factory.name}{e.location ? ` · ${e.location}` : ''}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-right tabular-nums text-navy">{e.status === 'OFFLINE' ? '—' : formatKw(e.currentPowerKw)}</td>
                      <td className="px-4 py-3"><SourceBadge source={e.dataSource} compact /></td>
                      <td className="px-4 py-3 text-muted">{formatRelative(e.lastSeenAt)}</td>
                      {canWrite && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setFormOpen(true); }} aria-label={`${e.name} — tahrirlash`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleting(e)} aria-label={`${e.name} — o‘chirish`} className="text-danger hover:bg-danger-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination page={page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {formOpen && (
        <EquipmentFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          initial={editing}
          factories={factories}
          categories={categories}
          onSaved={() => {
            push('success', editing ? 'Uskuna saqlandi' : 'Uskuna qo‘shildi');
            setFormOpen(false);
            void load();
            router.refresh();
          }}
        />
      )}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Uskunani o‘chirish"
        description={deleting ? `"${deleting.name}" va uning barcha o‘lchovlari, ogohlantirishlari o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>Bekor qilish</Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>O‘chirish</Button>
          </>
        }
      >
        <p className="text-sm text-muted">Amal audit jurnaliga yoziladi.</p>
      </Modal>
    </div>
  );
}
