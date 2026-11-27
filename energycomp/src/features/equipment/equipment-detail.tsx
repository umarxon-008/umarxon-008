'use client';

import { RelTime } from '@/components/ui/rel-time';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Pencil } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/states';
import { AlertStatusBadge, SeverityBadge, SourceBadge, StatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { EnergyBarChart, PowerLineChart, type SeriesPoint } from '@/features/charts/charts';
import { AnalysisCard, type AnalysisRecord } from '@/features/inspector/analysis-card';
import { api, errorMessage } from '@/lib/api-client';
import { useApiData, useInterval } from '@/lib/use-api';
import { formatDateTime, formatKw, formatKwh } from '@/lib/format';
import { resolveThresholds } from '@/lib/status';
import type { EquipmentStatusName, SeverityName, AlertStatusName } from '@/lib/labels';
import { EquipmentFormModal, type EquipmentFormValues } from './equipment-form';
import { ControlPanel } from './control-panel';

export interface DetailEquipment extends EquipmentFormValues {
  id: string;
  status: EquipmentStatusName;
  currentPowerKw: number;
  totalEnergyKwh: number;
  lastSeenAt: string | null;
  productionState: string | null;
  lastProductionAt: string | null;
  simulatedState: string | null;
  factory: { id: string; name: string };
  category: { id: string; name: string } | null;
}

const PRODUCTION_LABEL: Record<string, string> = {
  PRODUCING: 'Ishlab chiqarmoqda (signal bo‘yicha)',
  NOT_PRODUCING: 'Signal: ishlab chiqarmayapti',
  NO_SIGNAL: 'Ishlab chiqarish signali kelmadi',
};

export function EquipmentDetail(props: {
  equipment: DetailEquipment;
  week: SeriesPoint[];
  todayKwh: number;
  alerts: { id: string; title: string; severity: SeverityName; status: AlertStatusName; detectedAt: string }[];
  analyses: AnalysisRecord[];
  factories: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  timezone: string;
  currency: string;
  perms: { write: boolean; analyze: boolean; feedback: boolean; controlRequest: boolean; controlReview: boolean };
  userId: string;
}) {
  const { timezone, currency, perms } = props;
  const router = useRouter();
  const { push } = useToast();
  const [minutes, setMinutes] = useState<'60' | '180' | '720'>('60');
  const live = useApiData<{ equipment: DetailEquipment; readings: { timestamp: string; powerKw: number }[] }>(
    `/api/equipment/${props.equipment.id}/readings?minutes=${minutes}`,
  );
  useInterval(live.reload, 30_000);
  const eq: DetailEquipment = live.data ? { ...props.equipment, ...live.data.equipment } : props.equipment;
  const readings = live.data?.readings ?? (live.error ? [] : null);
  const load = live.reload;
  const [editOpen, setEditOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState(props.analyses);

  async function analyze() {
    setAnalyzing(true);
    try {
      const a = await api<AnalysisRecord>('/api/ai/analyze', { body: { equipmentId: eq.id } });
      setAnalyses((list) => [a, ...list]);
      push('success', 'AI tahlil tayyor');
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setAnalyzing(false);
    }
  }

  const th = resolveThresholds(eq);
  return (
    <div>
      <Link href="/app/equipment" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Uskunalar
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-navy sm:text-2xl">{eq.name}</h1>
            <StatusBadge status={eq.status} />
            <SourceBadge source={eq.dataSource} />
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">{eq.code}</span> · {eq.category?.name ?? 'Kategoriyasiz'} · {eq.factory.name}
            {eq.location ? ` · ${eq.location}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {perms.analyze && (
            <Button variant="secondary" onClick={analyze} loading={analyzing}>
              {!analyzing && <Bot className="h-4 w-4" aria-hidden />} AI tahlil
            </Button>
          )}
          {perms.write && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden /> Tahrirlash
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Joriy quvvat" value={eq.status === 'OFFLINE' ? '—' : formatKw(eq.currentPowerKw)} sub={`Nominal: ${formatKw(eq.nominalPowerKw)}`} />
        <StatCard label="Bugungi energiya" value={formatKwh(props.todayKwh)} tone="green" />
        <StatCard label="Jami energiya" value={formatKwh(eq.totalEnergyKwh)} tone="navy" />
        <StatCard
          label="Oxirgi aloqa"
          value={<RelTime value={eq.lastSeenAt} />}
          tone={eq.status === 'OFFLINE' ? 'red' : 'blue'}
          sub={eq.hasProductionSignal ? PRODUCTION_LABEL[eq.productionState ?? 'NO_SIGNAL'] : undefined}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Quvvat (kW)"
            action={
              <Segmented
                label="Davr"
                size="sm"
                value={minutes}
                onChange={setMinutes}
                options={[
                  { value: '60', label: '1 soat' },
                  { value: '180', label: '3 soat' },
                  { value: '720', label: '12 soat' },
                ]}
              />
            }
          />
          <CardBody>{readings === null ? <p className="py-16 text-center text-sm text-muted">Yuklanmoqda...</p> : <PowerLineChart data={readings} timezone={timezone} reference={eq.baselinePowerKw} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Uskuna ma’lumotlari" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              {[
                ['Ishlab chiqaruvchi', eq.manufacturer ?? '—'],
                ['Model', eq.model ?? '—'],
                ['Nominal quvvat', formatKw(eq.nominalPowerKw)],
                ['Baseline', eq.baselinePowerKw ? formatKw(eq.baselinePowerKw) : 'belgilanmagan'],
                ['Kutish chegarasi', formatKw(th.standbyKw)],
                ['To‘xtash chegarasi', formatKw(th.idleKw)],
                ['Sensor / gateway', eq.sensorId ?? '—'],
                ['Ishlab chiqarish signali', eq.hasProductionSignal ? 'bor' : 'yo‘q'],
                ['Oxirgi o‘lchov', formatDateTime(eq.lastSeenAt, timezone)],
                ['Oxirgi ishlab chiqarish', formatDateTime(eq.lastProductionAt, timezone)],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="So‘nggi 7 kun — energiya (kWh)" />
          <CardBody>
            <EnergyBarChart data={props.week} granularity="day" timezone={timezone} currency={currency} height={220} />
          </CardBody>
        </Card>
        <ControlPanel
          equipmentId={eq.id}
          dataSource={eq.dataSource}
          simulatedState={eq.simulatedState}
          canRequest={perms.controlRequest}
          canReview={perms.controlReview}
          userId={props.userId}
          timezone={timezone}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Ogohlantirishlar" action={<Link href={`/app/ai-inspector?equipmentId=${eq.id}&status=ALL`} className="text-sm font-semibold text-brand">Barchasi →</Link>} />
          <CardBody>
            {props.alerts.length === 0 ? (
              <EmptyState title="Ogohlantirish yo‘q" />
            ) : (
              <ul className="space-y-2">
                {props.alerts.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <AlertStatusBadge status={a.status} />
                    </div>
                    <Link href={`/app/ai-inspector?alert=${a.id}`} className="mt-1 block text-sm font-medium text-navy hover:text-brand">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted">{formatDateTime(a.detectedAt, timezone)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="AI tahlillari" icon={<Bot className="h-5 w-5 text-brand" aria-hidden />} />
          <CardBody className="space-y-3">
            {analyses.length === 0 ? (
              <EmptyState title="Hali tahlil yo‘q" description={perms.analyze ? '“AI tahlil” tugmasini bosing.' : undefined} />
            ) : (
              analyses.slice(0, 3).map((a) => <AnalysisCard key={a.id} analysis={a} timezone={timezone} canFeedback={perms.feedback} />)
            )}
          </CardBody>
        </Card>
      </div>

      {editOpen && (
        <EquipmentFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={eq}
          factories={props.factories}
          categories={props.categories}
          onSaved={() => {
            setEditOpen(false);
            push('success', 'Saqlandi');
            router.refresh();
            load();
          }}
        />
      )}
    </div>
  );
}
