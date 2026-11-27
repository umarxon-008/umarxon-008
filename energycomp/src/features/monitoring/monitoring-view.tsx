'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { SourceBadge, StatusBadge } from '@/components/ui/status';
import { EnergyBarChart } from '@/features/charts/charts';
import { useApiData, useInterval } from '@/lib/use-api';
import { formatDateTime, formatKw, formatKwh, formatMoney, formatNumber } from '@/lib/format';
import type { getMonitoringData } from '@/server/services/telemetry';
import { RangeFilter, rangeToParams, type RangeState } from './range-filter';

type Data = Awaited<ReturnType<typeof getMonitoringData>>;

export function MonitoringView({
  factories,
  equipmentOptions,
  timezone,
  today,
  historyDays,
}: {
  factories: { id: string; name: string }[];
  equipmentOptions: { id: string; name: string; code: string; factoryId: string }[];
  timezone: string;
  today: string;
  historyDays: number;
}) {
  const [range, setRange] = useState<RangeState>({ preset: '7d', granularity: 'day', from: '', to: today });
  const [factoryId, setFactoryId] = useState('');
  const [selectedEq, setSelectedEq] = useState<string[]>([]);
  const [eqOpen, setEqOpen] = useState(false);

  const params = useMemo(() => {
    const sp = rangeToParams(range);
    if (factoryId) sp.set('factoryId', factoryId);
    for (const id of selectedEq) sp.append('equipmentId', id);
    return sp;
  }, [range, factoryId, selectedEq]);

  const valid = range.preset !== 'custom' || Boolean(range.from && range.to);
  const { data, error, loading, reload: load } = useApiData<Data>(valid ? `/api/monitoring?${params}` : null);
  useInterval(load, 60_000, range.preset === 'today' || range.preset === '24h');

  const eqChoices = equipmentOptions.filter((e) => !factoryId || e.factoryId === factoryId);
  const exportUrl = (mode: 'aggregated' | 'raw') => `/api/monitoring/export?${params}&mode=${mode}`;

  return (
    <div>
      <PageHeader
        title="Energy Monitoring"
        description="Quvvat (kW) va energiya sarfi (kWh)"
        actions={
          <>
            <a href={exportUrl('aggregated')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-navy hover:bg-surface" download>
              <Download className="h-4 w-4" aria-hidden /> CSV
            </a>
            <a href={exportUrl('raw')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-navy hover:bg-surface" download>
              <FileSpreadsheet className="h-4 w-4" aria-hidden /> Xom CSV
            </a>
          </>
        }
      />
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <RangeFilter value={range} onChange={setRange} maxDate={today} />
          <label className="text-xs text-muted">
            Zavod
            <Select value={factoryId} onChange={(e) => { setFactoryId(e.target.value); setSelectedEq([]); }} className="mt-1 h-9 w-48">
              <option value="">Barcha zavodlar</option>
              {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </label>
          <div className="relative">
            <span className="text-xs text-muted">Uskunalar</span>
            <button
              type="button"
              onClick={() => setEqOpen((v) => !v)}
              aria-expanded={eqOpen}
              className="mt-1 flex h-9 w-56 items-center justify-between rounded-xl border border-line bg-white px-3 text-sm text-navy"
            >
              {selectedEq.length ? `${selectedEq.length} ta tanlangan` : 'Barcha uskunalar'}
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden />
            </button>
            {eqOpen && (
              <div className="absolute z-30 mt-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-white p-3 shadow-pop">
                <div className="mb-2 flex justify-between text-xs">
                  <button type="button" className="font-semibold text-brand" onClick={() => setSelectedEq(eqChoices.map((e) => e.id))}>Barchasini tanlash</button>
                  <button type="button" className="font-semibold text-muted" onClick={() => setSelectedEq([])}>Tozalash</button>
                </div>
                <div className="space-y-2">
                  {eqChoices.map((e) => (
                    <Checkbox
                      key={e.id}
                      label={`${e.name} (${e.code})`}
                      checked={selectedEq.includes(e.id)}
                      onChange={(ev) => setSelectedEq((s) => (ev.target.checked ? [...s, e.id] : s.filter((x) => x !== e.id)))}
                    />
                  ))}
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setEqOpen(false)}>Tayyor</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && <ErrorState message={error} action={<Button onClick={load}>Qayta urinish</Button>} />}
      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}
      {data && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
          <div className="mb-4 space-y-2">
            {data.range.clampedByPlan && (
              <Notice tone="warning">Tarifingiz bo‘yicha tarix {historyDays} kun bilan cheklangan — boshlanish sanasi qisqartirildi.</Notice>
            )}
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {formatDateTime(data.range.from, timezone)} — {formatDateTime(data.range.to, timezone)} · Manba:
              {data.sources.demoReadings > 0 && <SourceBadge source="DEMO" compact />}
              {data.sources.realReadings > 0 && <SourceBadge source="REAL" compact />}
              {data.sources.readings === 0 && 'o‘lchov yo‘q'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Energiya (davr)" value={formatKwh(data.totals.energyKwh)} tone="green" />
            <StatCard label="Xarajat (davr)" value={formatMoney(data.totals.cost, data.currency)} tone="amber" sub={data.pricePerKwh ? `${formatMoney(data.pricePerKwh, data.currency)}/kWh` : undefined} />
            <StatCard label="O‘rtacha quvvat" value={formatKw(data.totals.avgPowerKw)} />
            <StatCard label="Maksimal quvvat" value={formatKw(data.totals.peakKw)} tone="orange" />
            <StatCard label="Joriy quvvat" value={formatKw(data.totals.currentPowerKw)} tone="navy" sub="Hozir" />
          </div>
          <Card className="mt-5">
            <CardHeader title="Energiya sarfi (kWh)" />
            <CardBody>
              <EnergyBarChart data={data.series} granularity={data.range.granularity} timezone={timezone} currency={data.currency} height={300} />
            </CardBody>
          </Card>
          <Card className="mt-5">
            <CardHeader title="Uskunalar bo‘yicha" />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Uskuna</th>
                    <th scope="col" className="px-3 py-2">Holat</th>
                    <th scope="col" className="px-3 py-2 text-right">Joriy, kW</th>
                    <th scope="col" className="px-3 py-2 text-right">O‘rtacha, kW</th>
                    <th scope="col" className="px-3 py-2 text-right">Maks., kW</th>
                    <th scope="col" className="px-3 py-2 text-right">Energiya, kWh</th>
                    <th scope="col" className="px-3 py-2 text-right">Ulush</th>
                    <th scope="col" className="px-3 py-2 text-right">Xarajat</th>
                    <th scope="col" className="px-3 py-2">Manba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.equipment.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2"><Link href={`/app/equipment/${e.id}`} className="font-medium text-navy hover:text-brand">{e.name}</Link> <span className="text-xs text-muted">{e.code}</span></td>
                      <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.status === 'OFFLINE' ? '—' : formatNumber(e.currentPowerKw, 2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.avgPowerKw, 2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.maxPowerKw, 2)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-navy">{formatNumber(e.energyKwh, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.share * 100, 1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(e.cost, data.currency)}</td>
                      <td className="px-3 py-2"><SourceBadge source={e.dataSource} compact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
