'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Leaf, Lock, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { AlertsTrendChart, EnergyBarChart, HourlyProfileChart, ShareBars } from '@/features/charts/charts';
import { RangeFilter, rangeToParams, type RangeState } from '@/features/monitoring/range-filter';
import { useApiData } from '@/lib/use-api';
import { formatDate, formatKwh, formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { tokens } from '@/lib/tokens';
import type { getAnalytics } from '@/server/services/analytics';

type Data = Awaited<ReturnType<typeof getAnalytics>>;

function Change({ value, invert = true, incomplete }: { value: number | null; invert?: boolean; incomplete?: boolean }) {
  if (incomplete || value === null) return <span>Taqqoslash uchun ma’lumot yetarli emas</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={good ? 'text-energy-600' : 'text-orange'}>
      <Icon className="mr-1 inline h-3.5 w-3.5" aria-hidden />
      {formatPercent(value)} oldingi davrga
    </span>
  );
}

export function AnalyticsView({ timezone, today, canEditBaseline }: { timezone: string; today: string; canEditBaseline: boolean }) {
  const [range, setRange] = useState<RangeState>({ preset: '30d', granularity: 'day', from: '', to: today });
  const params = useMemo(() => rangeToParams(range), [range]);
  const valid = range.preset !== 'custom' || Boolean(range.from && range.to);
  const { data, error, loading, reload: load } = useApiData<Data>(valid ? `/api/analytics?${params}` : null);

  return (
    <div>
      <PageHeader
        title="Analytics va hisobotlar"

        actions={
          <a href={`/api/analytics/export?${params}`} download className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-navy hover:bg-surface">
            <Download className="h-4 w-4" aria-hidden /> CSV hisobot
          </a>
        }
      />
      <Card className="mb-5 p-4">
        <RangeFilter value={range} onChange={setRange} maxDate={today} />
      </Card>
      {error && <ErrorState message={error} action={<Button onClick={load}>Qayta urinish</Button>} />}
      {!data && !error && <Skeleton className="h-96" />}
      {data && (
        <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
          <p className="mb-3 text-xs text-muted">
            {formatDate(data.range.from, timezone)} — {formatDate(data.range.to, timezone)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Umumiy iste’mol" value={formatKwh(data.totals.energyKwh)} tone="green" sub={<Change value={data.totals.energyChange} incomplete={!data.totals.previousComplete} />} />
            <StatCard label="Xarajat" value={formatMoney(data.totals.cost, data.currency)} tone="amber" sub={<Change value={data.totals.costChange} incomplete={!data.totals.previousComplete} />} />
            <StatCard label="Oldingi davr" value={formatKwh(data.totals.previousEnergyKwh)} />
            {data.savings ? (
              <StatCard
                label="Taxminiy tejash"
                icon={<Leaf className="h-5 w-5" aria-hidden />}
                tone={data.savings.savingsKwh >= 0 ? 'green' : 'orange'}
                value={formatKwh(data.savings.savingsKwh)}
                sub="Taxminiy"
              />
            ) : (
              <StatCard
                label="Tejalgan energiya"
                icon={<Leaf className="h-5 w-5" aria-hidden />}
                value="—"
                sub={canEditBaseline ? <Link href="/app/organization#baseline" className="font-semibold text-brand">Baseline belgilash</Link> : 'Baseline belgilanmagan'}
              />
            )}
          </div>
          {data.savings && (
            <details className="mt-3 text-sm text-muted">
              <summary className="cursor-pointer font-medium text-navy">Tejash qanday hisoblanadi?</summary>
              <p className="mt-1">{data.savings.method} Baseline ({formatDate(data.savings.baselineStart, timezone)} — {formatDate(data.savings.baselineEnd, timezone)}) kunlik o‘rtachasi: {formatKwh(data.savings.baselineDailyKwh)}.</p>
            </details>
          )}

          <Card className="mt-5">
            <CardHeader title="Iste’mol dinamikasi (kWh)" />
            <CardBody>
              <EnergyBarChart data={data.series} granularity={data.range.granularity} timezone={timezone} currency={data.currency} height={280} />
            </CardBody>
          </Card>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Eng ko‘p sarflaganlar" />
              <CardBody>
                <ShareBars items={data.byEquipment.slice(0, 8).map((e) => ({ id: e.id, label: e.name, value: e.energyKwh, share: e.share, href: `/app/equipment/${e.id}` }))} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Ogohlantirishlar" />
              <CardBody>
                <AlertsTrendChart data={data.alertsTrend} timezone={timezone} />
              </CardBody>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {data.advancedAvailable && data.advanced ? (
              <>
                <Card>
                  <CardHeader title="Kategoriyalar kesimida" action={<Badge tone="navy">Pro</Badge>} />
                  <CardBody>
                    <ShareBars color={tokens.navy} items={data.advanced.byCategory.map((c) => ({ id: c.category, label: c.category, value: c.energyKwh, share: c.share }))} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Soatlik yuklama (kW)" action={<Badge tone="navy">Pro</Badge>} />
                  <CardBody>
                    <HourlyProfileChart data={data.advanced.hourly} />
                  </CardBody>
                </Card>
              </>
            ) : (
              <Card className="xl:col-span-2">
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <Lock className="h-6 w-6 text-muted" aria-hidden />
                  <p className="font-semibold text-navy">Kengaytirilgan analytics — Pro tarifida</p>
                  <Link href="/app/billing" className="text-sm font-semibold text-brand">Tariflarni ko‘rish →</Link>
                </div>
              </Card>
            )}
          </div>

          <Card className="mt-5">
            <CardHeader title="Uskunalar bo‘yicha" />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Uskuna</th>
                    <th scope="col" className="px-3 py-2">Kategoriya</th>
                    <th scope="col" className="px-3 py-2 text-right">Energiya, kWh</th>
                    <th scope="col" className="px-3 py-2 text-right">Ulush</th>
                    <th scope="col" className="px-3 py-2 text-right">Oldingi davr, kWh</th>
                    <th scope="col" className="px-3 py-2 text-right">O‘zgarish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.byEquipment.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 font-medium text-navy">{e.name}</td>
                      <td className="px-3 py-2 text-muted">{e.category}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.energyKwh, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.share * 100, 1)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(e.previousEnergyKwh, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPercent(e.change)}</td>
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
