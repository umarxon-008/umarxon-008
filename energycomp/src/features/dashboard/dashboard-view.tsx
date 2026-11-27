'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Coins, Gauge, Plus, RefreshCw, TriangleAlert, Zap } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Notice } from '@/components/ui/notice';
import { LinkButton, Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { SeverityBadge, StatusIcon } from '@/components/ui/status';
import { EnergyBarChart, ShareBars } from '@/features/charts/charts';
import { api } from '@/lib/api-client';
import { formatDateTime, formatKw, formatKwh, formatMoney, formatRelative } from '@/lib/format';
import { STATUS_LABELS, type EquipmentStatusName } from '@/lib/labels';
import { STATUS_COLORS } from '@/lib/tokens';
import type { getDashboard } from '@/server/services/dashboard';

type Data = Awaited<ReturnType<typeof getDashboard>>;

/** Tavsiyaning birinchi gapi (dashboard’da qisqa ko‘rinish uchun). */
function firstSentence(text: string): string {
  return /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
}

const STATUS_ORDER: EquipmentStatusName[] = ['RUNNING', 'STANDBY', 'STOPPED', 'WARNING', 'OFFLINE'];

export function DashboardView({
  initial,
  timezone,
  currency,
  userName,
  canAddEquipment,
  welcome,
  denied,
}: {
  initial: Data;
  timezone: string;
  currency: string;
  userName: string;
  canAddEquipment: boolean;
  welcome: boolean;
  denied: boolean;
}) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      setData(await api<Data>('/api/dashboard'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yangilab bo‘lmadi');
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, []);


  return (
    <div>
      <PageHeader
        title={`Xush kelibsiz, ${userName.split(' ')[0]}`}
        description={<>Oxirgi ma’lumot: {data.lastDataAt ? formatDateTime(data.lastDataAt, timezone) : '—'}</>}
        actions={
          <>
            <Button variant="outline" onClick={refresh} loading={refreshing}>
              {!refreshing && <RefreshCw className="h-4 w-4" aria-hidden />} Yangilash
            </Button>
            {canAddEquipment && (
              <LinkButton href="/app/equipment?new=1">
                <Plus className="h-4 w-4" aria-hidden /> Uskuna qo‘shish
              </LinkButton>
            )}
          </>
        }
      />

      <div className="space-y-3">
        {denied && <Notice tone="warning">Bu sahifaga kirish uchun rolingizda ruxsat yo‘q.</Notice>}
        {error && <Notice tone="warning">Ma’lumotni yangilab bo‘lmadi: {error}</Notice>}
        {welcome && data.equipmentCount === 0 && (
          <Notice tone="info" title="Tashkilotingiz yaratildi!">Birinchi uskunangizni qo‘shing.</Notice>
        )}
      </div>

      {data.equipmentCount === 0 ? (
        <Card className="mt-5">
          <EmptyState
            title="Hali uskuna qo‘shilmagan"
            action={canAddEquipment ? <LinkButton href="/app/equipment?new=1">Uskuna qo‘shish</LinkButton> : undefined}
          />
        </Card>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Joriy quvvat" value={formatKw(data.currentPowerKw)} icon={<Zap className="h-5 w-5" aria-hidden />} sub="Hozir" />
            <StatCard label="Bugungi iste’mol" value={formatKwh(data.todayEnergyKwh)} icon={<Gauge className="h-5 w-5" aria-hidden />} tone="green" sub="Bugun" />
            <StatCard label="Bugungi xarajat" value={formatMoney(data.todayCost, currency)} icon={<Coins className="h-5 w-5" aria-hidden />} tone="amber" sub="Taxminiy" />
            <StatCard
              label="Ogohlantirishlar"
              value={data.alerts.open}
              icon={<TriangleAlert className="h-5 w-5" aria-hidden />}
              tone={data.alerts.critical > 0 ? 'red' : data.alerts.open > 0 ? 'orange' : 'green'}
              sub={data.alerts.critical ? `${data.alerts.critical} tasi jiddiy` : 'Ochiq'}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Energiya sarfi — 24 soat" action={<LinkButton href="/app/monitoring" variant="ghost" size="sm">Monitoring →</LinkButton>} />
              <CardBody>
                <EnergyBarChart data={data.series24h} granularity="hour" timezone={timezone} currency={currency} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Uskunalar holati" description={`${data.equipmentCount} ta uskuna`} action={<LinkButton href="/app/factory-map" variant="ghost" size="sm">Xarita →</LinkButton>} />
              <CardBody>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                  {STATUS_ORDER.map((s) => (
                    <li key={s} className="flex items-center gap-2 rounded-xl border border-line p-3">
                      <span className="rounded-lg p-1.5 text-white" style={{ background: STATUS_COLORS[s] }}>
                        <StatusIcon status={s} className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-lg font-bold leading-tight text-navy">{data.statusCounts[s] ?? 0}</span>
                        <span className="block text-xs text-muted">{STATUS_LABELS[s]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <Card>
              <CardHeader title="Eng ko‘p sarflaganlar" description="Bugun" />
              <CardBody>
                <ShareBars items={data.topConsumers.map((t) => ({ id: t.id, label: t.name, value: t.energyKwh, share: t.share, href: `/app/equipment/${t.id}` }))} />
              </CardBody>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader
                title="AI tavsiyalari"
                icon={<Bot className="h-5 w-5 text-brand" aria-hidden />}
                action={<LinkButton href="/app/ai-inspector" variant="ghost" size="sm">Barchasi →</LinkButton>}
              />
              <CardBody>
                {data.alerts.latest.length === 0 ? (
                  <EmptyState title="Hammasi joyida" description="Noodatiy holat aniqlanmadi." />
                ) : (
                  <ul className="space-y-3">
                    {data.alerts.latest.map((a) => (
                      <li key={a.id} className="rounded-xl border border-line p-4">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={a.severity} />
                          <span className="ml-auto text-xs text-muted">{formatRelative(a.detectedAt, new Date(data.generatedAt))}</span>
                        </div>
                        <Link href={`/app/ai-inspector?alert=${a.id}`} className="mt-2 block font-semibold text-navy hover:text-brand">
                          {a.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted">{firstSentence(a.recommendation)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
