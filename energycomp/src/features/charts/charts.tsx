'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tokens, SEVERITY_CHART_COLORS } from '@/lib/tokens';
import { formatBucketLabel, formatKw, formatKwh, formatMoney, formatNumber, formatTime } from '@/lib/format';
import { SEVERITY_LABELS } from '@/lib/labels';
import { EmptyState } from '@/components/ui/states';
import { ChartFrame } from './chart-frame';

const axisProps = {
  tick: { fill: tokens.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: tokens.line },
} as const;

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-navy">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-1.5 text-muted">
          {r.color && <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden />}
          {r.label}: <span className="font-semibold text-navy tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface SeriesPoint {
  bucket: string;
  energyKwh: number;
  avgPowerKw: number;
  peakKw: number;
  cost: number | null;
  demoShare: number;
}

/** Energiya (kWh) ustunlari. O'rtacha/maksimal quvvat (kW) tooltip va jadvalda — ikki o'qli grafik ishlatilmaydi. */
export function EnergyBarChart({
  data,
  granularity,
  timezone,
  currency,
  height = 260,
}: {
  data: SeriesPoint[];
  granularity: string;
  timezone: string;
  currency: string;
  height?: number;
}) {
  const rows = data.map((d) => ({ ...d, label: formatBucketLabel(d.bucket, granularity, timezone) }));
  return (
    <ChartFrame
      title="Energiya sarfi (kWh)"
      rows={rows}
      height={height}
      empty={<EmptyState title="Bu davr uchun ma’lumot yo‘q" description="Sana oralig‘ini yoki filtrlarni o‘zgartirib ko‘ring." />}
      columns={[
        { key: 'l', label: 'Davr', render: (r) => r.label },
        { key: 'e', label: 'Energiya', render: (r) => formatKwh(r.energyKwh), align: 'right' },
        { key: 'a', label: 'O‘rtacha quvvat', render: (r) => formatKw(r.avgPowerKw), align: 'right' },
        { key: 'p', label: 'Maks. quvvat', render: (r) => formatKw(r.peakKw), align: 'right' },
        { key: 'c', label: 'Xarajat', render: (r) => formatMoney(r.cost, currency), align: 'right' },
        { key: 's', label: 'Manba', render: (r) => (r.demoShare >= 0.999 ? 'Demo' : r.demoShare <= 0.001 ? 'Real' : `${Math.round(r.demoShare * 100)}% demo`) },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={tokens.line} strokeDasharray="0" />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => formatNumber(v, 0)} />
          <Tooltip
            cursor={{ fill: tokens.surface }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!p) return null;
              return (
                <TooltipBox
                  title={p.label}
                  rows={[
                    { label: 'Energiya', value: formatKwh(p.energyKwh), color: tokens.brand },
                    { label: 'O‘rtacha quvvat', value: formatKw(p.avgPowerKw) },
                    { label: 'Maks. quvvat', value: formatKw(p.peakKw) },
                    { label: 'Xarajat', value: formatMoney(p.cost, currency) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="energyKwh" name="Energiya, kWh" fill={tokens.brand} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Daqiqalik quvvat (kW) chizig'i — uskuna sahifasi uchun. */
export function PowerLineChart({
  data,
  timezone,
  height = 220,
  reference,
}: {
  data: { timestamp: string; powerKw: number }[];
  timezone: string;
  height?: number;
  reference?: number | null;
}) {
  const rows = data.map((d) => ({ ...d, label: formatTime(d.timestamp, timezone) }));
  return (
    <ChartFrame
      title="Quvvat (kW)"
      rows={rows}
      height={height}
      empty={<EmptyState title="So‘nggi davrda o‘lchov yo‘q" description="Uskunadan ma’lumot kelmayapti yoki u yangi qo‘shilgan." />}
      columns={[
        { key: 't', label: 'Vaqt', render: (r) => r.label },
        { key: 'p', label: 'Quvvat', render: (r) => formatKw(r.powerKw), align: 'right' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tokens.brand} stopOpacity={0.18} />
              <stop offset="100%" stopColor={tokens.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={tokens.line} />
          <XAxis dataKey="label" {...axisProps} minTickGap={32} />
          <YAxis {...axisProps} axisLine={false} width={48} tickFormatter={(v: number) => formatNumber(v, 0)} domain={[0, (max: number) => Math.max(max, reference ?? 0) * 1.1]} />
          <Tooltip
            cursor={{ stroke: tokens.muted, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!p) return null;
              return <TooltipBox title={p.label} rows={[{ label: 'Quvvat', value: formatKw(p.powerKw), color: tokens.brand }, ...(reference ? [{ label: 'Baseline', value: formatKw(reference) }] : [])]} />;
            }}
          />
          <Area type="monotone" dataKey="powerKw" stroke={tokens.brand} strokeWidth={2} fill="url(#pw)" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function AlertsTrendChart({ data, timezone, height = 220 }: { data: { day: string; INFO: number; WARNING: number; CRITICAL: number }[]; timezone: string; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: formatBucketLabel(d.day, 'day', timezone) }));
  const keys = ['INFO', 'WARNING', 'CRITICAL'] as const;
  return (
    <ChartFrame
      title="Ogohlantirishlar dinamikasi"
      rows={rows}
      height={height}
      empty={<EmptyState title="Bu davrda ogohlantirish bo‘lmagan" />}
      columns={[
        { key: 'd', label: 'Kun', render: (r) => r.label },
        ...keys.map((k) => ({ key: k, label: SEVERITY_LABELS[k], render: (r: (typeof rows)[number]) => r[k], align: 'right' as const })),
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={tokens.line} />
          <XAxis dataKey="label" {...axisProps} minTickGap={20} />
          <YAxis {...axisProps} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip cursor={{ fill: tokens.surface }} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: tokens.navy }} formatter={(v: string) => <span style={{ color: tokens.navy }}>{v}</span>} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} name={SEVERITY_LABELS[k]} stackId="a" fill={SEVERITY_CHART_COLORS[k]} stroke="#fff" strokeWidth={2} maxBarSize={32} radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HourlyProfileChart({ data, height = 220 }: { data: { hour: number; avgPowerKw: number }[]; height?: number }) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, '0')}:00`, avgPowerKw: data.find((d) => d.hour === h)?.avgPowerKw ?? 0 }));
  return (
    <ChartFrame
      title="Soatlik yuklama profili"
      rows={rows}
      height={height}
      columns={[
        { key: 'h', label: 'Soat', render: (r) => r.label },
        { key: 'p', label: 'O‘rtacha quvvat', render: (r) => formatKw(r.avgPowerKw), align: 'right' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={tokens.line} />
          <XAxis dataKey="label" {...axisProps} interval={2} />
          <YAxis {...axisProps} axisLine={false} width={48} tickFormatter={(v: number) => formatNumber(v, 0)} />
          <Tooltip cursor={{ fill: tokens.surface }} content={({ active, payload }) => {
            const p = active && payload?.[0]?.payload as (typeof rows)[number] | undefined;
            return p ? <TooltipBox title={p.label} rows={[{ label: 'O‘rtacha quvvat', value: formatKw(p.avgPowerKw), color: tokens.energy }]} /> : null;
          }} />
          <Bar dataKey="avgPowerKw" fill="#179A64" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Gorizontal ulush ro'yxati (HTML) — eng ko'p iste'mol qiluvchilar, kategoriyalar. */
export function ShareBars({
  items,
  valueLabel = (v: number) => formatKwh(v),
  color = tokens.brand,
}: {
  items: { id: string; label: string; value: number; share: number; href?: string; sub?: React.ReactNode }[];
  valueLabel?: (v: number) => string;
  color?: string;
}) {
  if (!items.length) return <EmptyState title="Ma’lumot yo‘q" />;
  const max = Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {i.href ? (
              <a href={i.href} className="truncate font-medium text-navy hover:text-brand hover:underline">
                {i.label}
              </a>
            ) : (
              <span className="truncate font-medium text-navy">{i.label}</span>
            )}
            <span className="shrink-0 tabular-nums text-navy">
              {valueLabel(i.value)} <span className="text-xs text-muted">({formatNumber(i.share * 100, 1)}%)</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-[#eaf0f8]" aria-hidden>
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: color }} />
          </div>
          {i.sub && <div className="mt-1 text-xs text-muted">{i.sub}</div>}
        </li>
      ))}
    </ul>
  );
}
