'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { CURRENCIES, INDUSTRIES, TIME_ZONES } from '@/lib/labels';

export interface OrgData {
  name: string;
  industry: string;
  timezone: string;
  currency: string;
  controlMode: 'READ_ONLY' | 'SIMULATION';
  baselineStart: string | null;
  baselineEnd: string | null;
  baselineStartInput: string | null;
  baselineEndInput: string | null;
  tariffs: { id: string; name: string; pricePerKwh: number; currency: string; validFrom: string }[];
  categories: { id: string; name: string }[];
}

interface Perms {
  orgUpdate: boolean;
  tariff: boolean;
  factoryWrite: boolean;
  factoryDelete: boolean;
  category: boolean;
  control: boolean;
  audit: boolean;
}

function useSaver() {
  const router = useRouter();
  const { push } = useToast();
  return async (fn: () => Promise<unknown>, msg: string, setErr?: (e: Record<string, string>) => void) => {
    try {
      await fn();
      push('success', msg);
      router.refresh();
      return true;
    } catch (e) {
      push('error', errorMessage(e));
      if (e instanceof ApiClientError && setErr) setErr(e.fieldErrors());
      return false;
    }
  };
}

function InfoSection({ org, canEdit }: { org: OrgData; canEdit: boolean }) {
  const save = useSaver();
  const [v, setV] = useState({ name: org.name, industry: org.industry, timezone: org.timezone, currency: org.currency });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader title="Tashkilot ma’lumotlari" />
      <CardBody>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErrs({});
            await save(() => api('/api/organization', { method: 'PATCH', body: v }), 'Saqlandi', setErrs);
            setBusy(false);
          }}
        >
          <Field label="Nomi" required error={errs.name}>{(p) => <Input {...p} value={v.name} disabled={!canEdit} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
          <Field label="Sanoat yo‘nalishi" error={errs.industry}>
            {(p) => (
              <Select {...p} value={v.industry} disabled={!canEdit} onChange={(e) => setV({ ...v, industry: e.target.value })}>
                {[...new Set([...INDUSTRIES, v.industry])].map((i) => <option key={i}>{i}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Vaqt zonasi" error={errs.timezone}>
            {(p) => (
              <Select {...p} value={v.timezone} disabled={!canEdit} onChange={(e) => setV({ ...v, timezone: e.target.value })}>
                {[...new Set([...TIME_ZONES, v.timezone])].map((t) => <option key={t}>{t}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Valyuta" error={errs.currency} hint="Mavjud tariflar valyutasi avtomatik o‘zgarmaydi">
            {(p) => (
              <Select {...p} value={v.currency} disabled={!canEdit} onChange={(e) => setV({ ...v, currency: e.target.value })}>
                {[...new Set([...CURRENCIES, v.currency])].map((c) => <option key={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          {canEdit && <div className="sm:col-span-2"><Button type="submit" loading={busy}>Saqlash</Button></div>}
        </form>
      </CardBody>
    </Card>
  );
}

function TariffSection({ org, canEdit }: { org: OrgData; canEdit: boolean }) {
  const save = useSaver();
  const [v, setV] = useState({ name: '', pricePerKwh: '', validFrom: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  return (
    <Card>
      <CardHeader title="Energiya tarifi (kWh narxi)" />
      <CardBody className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr><th scope="col" className="px-3 py-2">Nomi</th><th scope="col" className="px-3 py-2 text-right">Narx / kWh</th><th scope="col" className="px-3 py-2">Amal qiladi</th>{canEdit && <th className="px-3 py-2"><span className="sr-only">Amal</span></th>}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {org.tariffs.map((t, i) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 text-navy">{t.name} {i === 0 && <Badge tone="green">joriy</Badge>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(t.pricePerKwh, t.currency)}</td>
                  <td className="px-3 py-2 text-muted">{formatDate(t.validFrom, org.timezone)} dan</td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" className="text-danger" disabled={org.tariffs.length <= 1} onClick={() => save(() => api(`/api/organization/tariffs/${t.id}`, { method: 'DELETE' }), 'Tarif o‘chirildi')} aria-label={`${t.name} tarifini o‘chirish`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <form
            className="grid gap-3 sm:grid-cols-4 sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setErrs({});
              const ok = await save(() => api('/api/organization/tariffs', { body: { name: v.name, pricePerKwh: Number(v.pricePerKwh), validFrom: v.validFrom } }), 'Tarif qo‘shildi', setErrs);
              if (ok) setV({ name: '', pricePerKwh: '', validFrom: '' });
            }}
          >
            <Field label="Tarif nomi" error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="2027 tarifi" />}</Field>
            <Field label={`Narx (${org.currency}/kWh)`} error={errs.pricePerKwh}>{(p) => <Input {...p} type="number" step="0.01" min="0" value={v.pricePerKwh} onChange={(e) => setV({ ...v, pricePerKwh: e.target.value })} />}</Field>
            <Field label="Amal qilish sanasi" error={errs.validFrom}>{(p) => <Input {...p} type="date" value={v.validFrom} onChange={(e) => setV({ ...v, validFrom: e.target.value })} />}</Field>
            <Button type="submit"><Plus className="h-4 w-4" aria-hidden /> Qo‘shish</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

interface FactoryRow { id: string; name: string; address: string | null; description: string | null; _count: { equipment: number } }

function FactoriesSection({ factories, perms, limit }: { factories: FactoryRow[]; perms: Perms; limit: { used: number; max: number } }) {
  const save = useSaver();
  const [edit, setEdit] = useState<Partial<FactoryRow> | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Zavodlar"
        description={`${limit.used} / ${limit.max} (tarif limiti)`}
        action={perms.factoryWrite && <Button size="sm" onClick={() => { setErrs({}); setEdit({}); }} disabled={limit.used >= limit.max}><Plus className="h-4 w-4" aria-hidden /> Zavod qo‘shish</Button>}
      />
      <CardBody>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {factories.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="font-semibold text-navy">{f.name}</p>
                <p className="text-xs text-muted">{f.address ?? 'Manzil ko‘rsatilmagan'} · {f._count.equipment} ta uskuna</p>
              </div>
              <div className="flex gap-1">
                {perms.factoryWrite && <Button size="sm" variant="ghost" onClick={() => { setErrs({}); setEdit(f); }} aria-label={`${f.name} — tahrirlash`}><Pencil className="h-4 w-4" /></Button>}
                {perms.factoryDelete && <Button size="sm" variant="ghost" className="text-danger" onClick={() => save(() => api(`/api/factories/${f.id}`, { method: 'DELETE' }), 'Zavod o‘chirildi')} aria-label={`${f.name} — o‘chirish`}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
      <Modal
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Zavodni tahrirlash' : 'Yangi zavod'}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Bekor qilish</Button><Button type="submit" form="factory-form" loading={busy}>Saqlash</Button></>}
      >
        {edit && (
          <form
            id="factory-form"
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setErrs({});
              const body = { name: edit.name ?? '', address: edit.address || null, description: edit.description || null };
              const ok = await save(() => (edit.id ? api(`/api/factories/${edit.id}`, { method: 'PATCH', body }) : api('/api/factories', { body })), 'Zavod saqlandi', setErrs);
              setBusy(false);
              if (ok) setEdit(null);
            }}
          >
            <Field label="Nomi" required error={errs.name}>{(p) => <Input {...p} value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />}</Field>
            <Field label="Manzil" error={errs.address}>{(p) => <Input {...p} value={edit.address ?? ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />}</Field>
            <Field label="Izoh" error={errs.description}>{(p) => <Textarea {...p} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />}</Field>
            {!edit.id && <p className="text-xs text-muted">Yangi zavod uchun bo‘sh 2D xarita rejasi yaratiladi.</p>}
          </form>
        )}
      </Modal>
    </Card>
  );
}

function CategoriesSection({ org, canEdit }: { org: OrgData; canEdit: boolean }) {
  const save = useSaver();
  const [name, setName] = useState('');
  return (
    <Card>
      <CardHeader title="Uskuna kategoriyalari" />
      <CardBody className="space-y-4">
        <ul className="flex flex-wrap gap-2">
          {org.categories.map((c) => (
            <li key={c.id} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm text-navy ring-1 ring-line">
              {c.name}
              {canEdit && (
                <button type="button" onClick={() => save(() => api(`/api/organization/categories/${c.id}`, { method: 'DELETE' }), 'Kategoriya o‘chirildi')} className="rounded-full p-0.5 text-muted hover:text-danger" aria-label={`${c.name} kategoriyasini o‘chirish`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await save(() => api('/api/organization/categories', { body: { name } }), 'Kategoriya qo‘shildi')) setName(''); }}>
            <label htmlFor="cat-name" className="sr-only">Kategoriya nomi</label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Qadoqlash mashinasi" className="max-w-xs" />
            <Button type="submit" disabled={name.trim().length < 2}><Plus className="h-4 w-4" aria-hidden /> Qo‘shish</Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function ControlSection({ org, canEdit }: { org: OrgData; canEdit: boolean }) {
  const save = useSaver();
  return (
    <Card>
      <CardHeader title="Smart Control rejimi" />
      <CardBody className="space-y-4">
        <Notice tone="warning">Real uskunaga buyruq yuborilmaydi. AI uskunani o‘zi boshqarmaydi.</Notice>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ['READ_ONLY', 'Faqat kuzatuv', 'Monitoring va tavsiyalar.'],
            ['SIMULATION', 'Simulyatsiya', 'Demo uskunalarni to‘xtatish so‘rovi, ikkinchi shaxs tasdig‘i bilan.'],
          ] as const).map(([mode, title, desc]) => (
            <button
              key={mode}
              type="button"
              disabled={!canEdit}
              aria-pressed={org.controlMode === mode}
              onClick={() => org.controlMode !== mode && save(() => api('/api/organization/control-mode', { method: 'PUT', body: { controlMode: mode } }), 'Rejim o‘zgartirildi')}
              className={`rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed ${org.controlMode === mode ? 'border-brand bg-brand-50' : 'border-line bg-white hover:border-brand-100'}`}
            >
              <p className="font-semibold text-navy">{title} {org.controlMode === mode && <Badge tone="blue">tanlangan</Badge>}</p>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function BaselineSection({ org, canEdit }: { org: OrgData; canEdit: boolean }) {
  const save = useSaver();
  const [v, setV] = useState({ start: org.baselineStartInput ?? '', end: org.baselineEndInput ?? '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  return (
    <Card>
      <CardHeader title="Baseline davri" description="Tejash shu davr bilan taqqoslanadi" />
      <CardBody className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-3 sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setErrs({});
            await save(() => api('/api/organization/baseline', { method: 'PUT', body: { baselineStart: v.start || null, baselineEnd: v.end || null } }), 'Baseline saqlandi', setErrs);
          }}
        >
          <Field label="Boshlanish" error={errs.baselineStart}>{(p) => <Input {...p} type="date" value={v.start} disabled={!canEdit} onChange={(e) => setV({ ...v, start: e.target.value })} />}</Field>
          <Field label="Tugash" error={errs.baselineEnd}>{(p) => <Input {...p} type="date" value={v.end} disabled={!canEdit} onChange={(e) => setV({ ...v, end: e.target.value })} />}</Field>
          {canEdit && (
            <div className="flex gap-2">
              <Button type="submit">Saqlash</Button>
              <Button variant="outline" onClick={() => { setV({ start: '', end: '' }); void save(() => api('/api/organization/baseline', { method: 'PUT', body: { baselineStart: null, baselineEnd: null } }), 'Baseline o‘chirildi'); }}>Tozalash</Button>
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

interface AuditItem { id: string; action: string; entityType: string; actorName: string; createdAt: string; metadata: unknown }

function AuditSection({ timezone }: { timezone: string }) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, error } = useApiData<{ items: AuditItem[]; total: number; pageSize: number }>(`/api/audit?page=${page}${action ? `&action=${action}` : ''}`);
  return (
    <Card>
      <CardHeader
        title="Audit jurnali"

        action={
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="h-9 w-48" aria-label="Amal turi">
            <option value="">Barcha amallar</option>
            <option value="control">Boshqaruv</option>
            <option value="alert">Ogohlantirishlar</option>
            <option value="ai">AI</option>
            <option value="equipment">Uskunalar</option>
            <option value="member">A’zolar</option>
            <option value="auth">Kirish</option>
          </Select>
        }
      />
      <CardBody>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th scope="col" className="px-2 py-2">Vaqt</th><th scope="col" className="px-2 py-2">Kim</th><th scope="col" className="px-2 py-2">Amal</th><th scope="col" className="px-2 py-2">Tafsilot</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap px-2 py-2 text-muted">{formatDateTime(i.createdAt, timezone)}</td>
                  <td className="px-2 py-2 text-navy">{i.actorName}</td>
                  <td className="px-2 py-2 font-mono text-xs text-navy">{i.action}</td>
                  <td className="max-w-md truncate px-2 py-2 font-mono text-xs text-muted" title={JSON.stringify(i.metadata)}>{JSON.stringify(i.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </CardBody>
    </Card>
  );
}

export function OrganizationView({ org, factories, perms, factoryLimit }: { org: OrgData; factories: FactoryRow[]; perms: Perms; factoryLimit: { used: number; max: number } }) {
  return (
    <div>
      <PageHeader title="Korxona sozlamalari" description={perms.orgUpdate ? undefined : <span>Ko‘rish rejimi — o‘zgartirish faqat tashkilot egasiga ruxsat etilgan.</span>} />
      <Tabs
        tabs={[
          { id: 'info', label: 'Ma’lumotlar', content: <InfoSection org={org} canEdit={perms.orgUpdate} /> },
          { id: 'tariff', label: 'Energiya tarifi', content: <TariffSection org={org} canEdit={perms.tariff} /> },
          { id: 'factories', label: 'Zavodlar', content: <FactoriesSection factories={factories} perms={perms} limit={factoryLimit} /> },
          { id: 'categories', label: 'Kategoriyalar', content: <CategoriesSection org={org} canEdit={perms.category} /> },
          { id: 'baseline', label: 'Baseline', content: <BaselineSection org={org} canEdit={perms.orgUpdate} /> },
          { id: 'control', label: 'Smart Control', content: <ControlSection org={org} canEdit={perms.control} /> },
          { id: 'audit', label: 'Audit jurnali', content: <AuditSection timezone={org.timezone} />, hidden: !perms.audit },
        ]}
      />
    </div>
  );
}
