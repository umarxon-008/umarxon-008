'use client';

import { RelTime } from '@/components/ui/rel-time';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Hand, Lock, Minus, Move, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { SourceBadge, StatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { EquipmentFormModal } from '@/features/equipment/equipment-form';
import { api, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatKw, formatKwh } from '@/lib/format';
import { STATUS_LABELS, type EquipmentStatusName } from '@/lib/labels';
import { STATUS_COLORS, ZONE_COLORS } from '@/lib/tokens';
import { clamp, cn } from '@/lib/utils';
import type { Zone } from '@/schemas/organization';

// 3D sahna faqat brauzerda va kerak bo'lganda yuklanadi (three.js og'ir kutubxona)
const Factory3D = dynamic(() => import('./factory-3d').then((m) => m.Factory3D), {
  ssr: false,
  loading: () => <div className="flex h-[420px] items-center justify-center text-sm text-muted sm:h-[520px]">3D xarita yuklanmoqda...</div>,
});

export interface MapEquipment {
  id: string;
  name: string;
  code: string;
  status: EquipmentStatusName;
  currentPowerKw: number;
  nominalPowerKw: number;
  mapX: number;
  mapY: number;
  dataSource: 'DEMO' | 'REAL';
  lastSeenAt: string | null;
  category: { name: string } | null;
  location: string | null;
}

interface Layout {
  width: number;
  height: number;
  zones: Zone[];
}

function StatusGlyph({ status }: { status: EquipmentStatusName }) {
  // Rangdan tashqari shakl ham holatni bildiradi (accessibility)
  switch (status) {
    case 'RUNNING':
      return <path d="M-6 0.5 -2 4.5 6 -4" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    case 'STANDBY':
      return <path d="M-3 -5v10M3 -5v10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />;
    case 'STOPPED':
      return <rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="#fff" />;
    case 'WARNING':
      return <path d="M0 -6v7M0 5.2v.3" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />;
    case 'OFFLINE':
      return <path d="M-4.5 -4.5 4.5 4.5M4.5 -4.5 -4.5 4.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />;
  }
}

export function FactoryMap({
  factories,
  factoryId,
  initialLayout,
  initialEquipment,
  categories,
  canEdit,
  canAddEquipment,
  has3d,
  initialView = '2d',
}: {
  factories: { id: string; name: string }[];
  factoryId: string;
  initialLayout: Layout;
  initialEquipment: MapEquipment[];
  categories: { id: string; name: string }[];
  canEdit: boolean;
  canAddEquipment: boolean;
  has3d: boolean;
  initialView?: '2d' | '3d';
}) {
  const [mapView, setMapView] = useState<'2d' | '3d'>(has3d ? initialView : '2d');
  const [resetKey, setResetKey] = useState(0);
  function switchView(v: '2d' | '3d') {
    setMapView(v);
    if (v === '3d') setEditMode(false);
    const url = new URL(window.location.href);
    if (v === '3d') url.searchParams.set('view', '3d');
    else url.searchParams.delete('view');
    window.history.replaceState(null, '', url);
  }
  const router = useRouter();
  const { push } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const [layout, setLayout] = useState<Layout>(initialLayout);
  const [savedLayout, setSavedLayout] = useState(JSON.stringify(initialLayout));
  const [equipment, setEquipment] = useState(initialEquipment);
  const [selected, setSelected] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const [pan, setPan] = useState<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const keySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zavod almashganda komponent key orqali qayta yaratiladi (page.tsx).
  // Server yangilanishida (router.refresh) faqat uskunalar holatini yangilaymiz — "oldingi props" patterni.
  const [prevInitial, setPrevInitial] = useState(initialEquipment);
  if (prevInitial !== initialEquipment) {
    setPrevInitial(initialEquipment);
    setEquipment(initialEquipment);
  }

  // Holatlarni jonli yangilash
  const reload = useCallback(async () => {
    try {
      const res = await api<{ items: MapEquipment[] }>(`/api/equipment?factoryId=${factoryId}&pageSize=200`);
      setEquipment((prev) => res.items.map((n) => ({ ...n, ...(drag?.id === n.id ? { mapX: prev.find((p) => p.id === n.id)?.mapX ?? n.mapX, mapY: prev.find((p) => p.id === n.id)?.mapY ?? n.mapY } : {}) })));
    } catch {
      /* jim */
    }
  }, [factoryId, drag]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && !drag && void reload(), 30_000);
    return () => clearInterval(t);
  }, [reload, drag]);

  const sel = equipment.find((e) => e.id === selected) ?? null;
  const detailQ = useApiData<{ equipment: { id: string }; readings: { powerKw: number; energyKwh: number }[] }>(selected ? `/api/equipment/${selected}/readings?minutes=30` : null);
  const detail = detailQ.data && detailQ.data.equipment.id === selected ? detailQ.data : null;

  const vb = useMemo(() => {
    const w = layout.width / view.scale;
    const h = layout.height / view.scale;
    return { x: view.x, y: view.y, w, h };
  }, [layout, view]);

  function toSvg(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function zoom(factor: number, cx?: number, cy?: number) {
    setView((v) => {
      const scale = clamp(v.scale * factor, 1, 4);
      const w = layout.width / v.scale;
      const h = layout.height / v.scale;
      const nw = layout.width / scale;
      const nh = layout.height / scale;
      const fx = cx ?? v.x + w / 2;
      const fy = cy ?? v.y + h / 2;
      const x = clamp(fx - ((fx - v.x) / w) * nw, 0, layout.width - nw);
      const y = clamp(fy - ((fy - v.y) / h) * nh, 0, layout.height - nh);
      return { scale, x, y };
    });
  }

  async function savePosition(id: string, mapX: number, mapY: number) {
    try {
      await api(`/api/equipment/${id}/position`, { method: 'PATCH', body: { mapX: Math.round(mapX), mapY: Math.round(mapY) } });
    } catch (e) {
      push('error', `Joylashuv saqlanmadi: ${errorMessage(e)}`);
      void reload();
    }
  }

  function onMarkerPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    setSelected(id);
    if (!editMode) return;
    const p = toSvg(e.clientX, e.clientY);
    const eq = equipment.find((x) => x.id === id)!;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ id, dx: p.x - eq.mapX, dy: p.y - eq.mapY, moved: false });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (drag) {
      const p = toSvg(e.clientX, e.clientY);
      const x = clamp(p.x - drag.dx, 10, layout.width - 10);
      const y = clamp(p.y - drag.dy, 10, layout.height - 10);
      setEquipment((list) => list.map((q) => (q.id === drag.id ? { ...q, mapX: x, mapY: y } : q)));
      if (!drag.moved) setDrag({ ...drag, moved: true });
    } else if (pan) {
      const svg = svgRef.current!;
      const rect = svg.getBoundingClientRect();
      const k = vb.w / rect.width;
      setView((v) => ({
        ...v,
        x: clamp(pan.vx - (e.clientX - pan.sx) * k, 0, layout.width - vb.w),
        y: clamp(pan.vy - (e.clientY - pan.sy) * k, 0, layout.height - vb.h),
      }));
    }
  }

  function onPointerUp() {
    if (drag?.moved) {
      const eq = equipment.find((x) => x.id === drag.id);
      if (eq) void savePosition(eq.id, eq.mapX, eq.mapY);
    }
    setDrag(null);
    setPan(null);
  }

  function onMarkerKey(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(id);
      return;
    }
    if (!editMode) return;
    const step = e.shiftKey ? 50 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setSelected(id);
    setEquipment((list) => {
      const next = list.map((q) => (q.id === id ? { ...q, mapX: clamp(q.mapX + d[0]!, 10, layout.width - 10), mapY: clamp(q.mapY + d[1]!, 10, layout.height - 10) } : q));
      const moved = next.find((q) => q.id === id)!;
      if (keySaveTimer.current) clearTimeout(keySaveTimer.current);
      keySaveTimer.current = setTimeout(() => void savePosition(id, moved.mapX, moved.mapY), 500);
      return next;
    });
  }

  const layoutDirty = JSON.stringify(layout) !== savedLayout;
  async function saveLayout() {
    try {
      await api(`/api/factories/${factoryId}/layout`, { method: 'PUT', body: layout });
      setSavedLayout(JSON.stringify(layout));
      push('success', 'Xarita rejasi saqlandi');
    } catch (e) {
      push('error', errorMessage(e));
    }
  }
  function updateZone(id: string, patch: Partial<Zone>) {
    setLayout((l) => ({ ...l, zones: l.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));
  }

  const counts = equipment.reduce<Record<string, number>>((m, e) => ((m[e.status] = (m[e.status] ?? 0) + 1), m), {});

  return (
    <div>
      <PageHeader
        title="Factory Map"
        description="Uskunani tanlang — ma’lumoti ochiladi"
        actions={
          <>
            <div role="radiogroup" aria-label="Xarita ko‘rinishi" className="inline-flex rounded-xl bg-[#e9f0fa] p-1">
              {(['2d', '3d'] as const).map((v) => {
                const locked = v === '3d' && !has3d;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={mapView === v}
                    disabled={locked}
                    title={locked ? '3D xarita — Pro tarifida' : undefined}
                    onClick={() => switchView(v)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      mapView === v ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy',
                    )}
                  >
                    {v.toUpperCase()}
                    {v === '3d' && (locked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Badge tone="violet">demo</Badge>)}
                  </button>
                );
              })}
            </div>
            {canEdit && mapView === '2d' && (
              <Button variant={editMode ? 'primary' : 'outline'} onClick={() => setEditMode((v) => !v)} aria-pressed={editMode}>
                {editMode ? <Hand className="h-4 w-4" aria-hidden /> : <Move className="h-4 w-4" aria-hidden />}
                {editMode ? 'Tayyor' : 'Tahrirlash'}
              </Button>
            )}
            {canAddEquipment && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Uskuna
              </Button>
            )}
          </>
        }
      />

      {factories.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-2" aria-label="Zavodni tanlash">
          {factories.map((f) => (
            <Link
              key={f.id}
              href={`/app/factory-map?factory=${f.id}`}
              aria-current={f.id === factoryId ? 'page' : undefined}
              className={cn('rounded-xl px-4 py-2 text-sm font-semibold', f.id === factoryId ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-line hover:bg-brand-50')}
            >
              {f.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <ul className="flex flex-wrap gap-3 text-xs text-muted" aria-label="Holatlar belgisi">
              {(Object.keys(STATUS_LABELS) as EquipmentStatusName[]).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden>
                    <circle r="8" fill={STATUS_COLORS[s]} />
                    <g transform="scale(0.8)">
                      <StatusGlyph status={s} />
                    </g>
                  </svg>
                  {STATUS_LABELS[s]} ({counts[s] ?? 0})
                </li>
              ))}
            </ul>
            {mapView === '3d' ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted sm:inline">Aylantirish: sudrang · yaqinlashtirish: g‘ildirak</span>
                <Button size="sm" variant="outline" onClick={() => setResetKey((k) => k + 1)} aria-label="Ko‘rinishni tiklash"><RotateCcw className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => zoom(1.25)} aria-label="Yaqinlashtirish"><Plus className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => zoom(0.8)} aria-label="Uzoqlashtirish"><Minus className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setView({ scale: 1, x: 0, y: 0 })} aria-label="Ko‘rinishni tiklash"><RotateCcw className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          {mapView === '3d' && (
            <p className="bg-[#f6f3fe] px-4 py-2 text-xs text-navy">3D xarita — demo versiya. Joylashuvlar 2D xaritadan olinadi, tahrirlash 2D rejimida.</p>
          )}
          {editMode && mapView === '2d' && (
            <p className="bg-brand-50 px-4 py-2 text-xs text-navy">
              Uskunani suring yoki strelkalar bilan siljiting — avtomatik saqlanadi.
            </p>
          )}
          {mapView === '3d' ? (
            <Factory3D key={resetKey} layout={layout} equipment={equipment} selected={selected} onSelect={setSelected} />
          ) : (
          <div className="relative bg-[#f8fbff]">
            <svg
              ref={svgRef}
              viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
              className={cn('block h-auto w-full touch-none select-none', pan ? 'cursor-grabbing' : 'cursor-grab')}
              style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerDown={(e) => {
                if (e.target === svgRef.current || (e.target as Element).getAttribute('data-bg')) {
                  setSelected(null);
                  setPan({ sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
                }
              }}
              onWheel={(e) => {
                const p = toSvg(e.clientX, e.clientY);
                zoom(e.deltaY < 0 ? 1.15 : 0.87, p.x, p.y);
              }}
              role="group"
              aria-label="Zavod 2D xaritasi"
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="#e3ebf6" strokeWidth="1" />
                </pattern>
              </defs>
              <rect data-bg="1" x="0" y="0" width={layout.width} height={layout.height} fill="url(#grid)" />
              <rect x="1" y="1" width={layout.width - 2} height={layout.height - 2} fill="none" stroke="#c9d7ea" strokeWidth="2" rx="12" pointerEvents="none" />
              {layout.zones.map((z) => (
                <g key={z.id} pointerEvents="none">
                  <rect x={z.x} y={z.y} width={z.width} height={z.height} rx="14" fill={ZONE_COLORS[z.color].fill} stroke={ZONE_COLORS[z.color].stroke} strokeWidth="2" />
                  <text x={z.x + 14} y={z.y + 24} fontSize="14" fontWeight="600" fill="#52627A">
                    {z.name}
                  </text>
                </g>
              ))}
              {equipment.map((e) => {
                const isSel = e.id === selected;
                return (
                  <g
                    key={e.id}
                    transform={`translate(${e.mapX} ${e.mapY})`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${e.name}, ${STATUS_LABELS[e.status]}, ${e.status === 'OFFLINE' ? 'quvvat noma’lum' : formatKw(e.currentPowerKw)}`}
                    aria-pressed={isSel}
                    onPointerDown={(ev) => onMarkerPointerDown(ev, e.id)}
                    onKeyDown={(ev) => onMarkerKey(ev, e.id)}
                    onFocus={() => setSelected(e.id)}
                    className={cn('outline-none', editMode ? 'cursor-move' : 'cursor-pointer')}
                  >
                    {isSel && <circle r="30" fill="none" stroke="#1677F2" strokeWidth="3" strokeDasharray="5 4" />}
                    <rect x="-24" y="-24" width="48" height="48" rx="14" fill="#fff" stroke={isSel ? '#1677F2' : '#102B5C'} strokeWidth={isSel ? 3 : 2} />
                    <rect x="-14" y="-13" width="20" height="13" rx="3" fill="#102B5C" />
                    <rect x="-14" y="5" width="28" height="5" rx="2.5" fill="#D3E5FD" />
                    <g transform="translate(18 -18)">
                      <circle r="10" fill={STATUS_COLORS[e.status]} stroke="#fff" strokeWidth="2.5" />
                      <g transform="scale(0.75)">
                        <StatusGlyph status={e.status} />
                      </g>
                    </g>
                    <text y="42" textAnchor="middle" fontSize="12" fontWeight="700" fill="#102B5C" paintOrder="stroke" stroke="#f8fbff" strokeWidth="4">
                      {e.code}
                    </text>
                  </g>
                );
              })}
            </svg>
            {equipment.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
                Bu zavodda hali uskuna yo‘q.{canAddEquipment && ' “Uskuna” tugmasi orqali qo‘shing.'}
              </div>
            )}
          </div>
          )}
        </Card>

        <div className="space-y-5">
          {sel ? (
            <Card>
              <div className="flex items-start justify-between gap-2 p-5 pb-0">
                <div>
                  <h2 className="font-semibold text-navy">{sel.name}</h2>
                  <p className="text-xs text-muted">
                    {sel.code} · {sel.category?.name ?? 'Kategoriyasiz'}
                    {sel.location ? ` · ${sel.location}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1 text-muted hover:bg-surface" aria-label="Panelni yopish">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={sel.status} />
                  <SourceBadge source={sel.dataSource} compact />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-surface p-3">
                    <dt className="text-xs text-muted">Joriy quvvat</dt>
                    <dd className="text-lg font-bold text-navy">{sel.status === 'OFFLINE' ? '—' : formatKw(sel.currentPowerKw)}</dd>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <dt className="text-xs text-muted">Nominal</dt>
                    <dd className="text-lg font-bold text-navy">{formatKw(sel.nominalPowerKw)}</dd>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <dt className="text-xs text-muted">Yuklama</dt>
                    <dd className="text-lg font-bold text-navy">{sel.status === 'OFFLINE' ? '—' : `${Math.round((sel.currentPowerKw / sel.nominalPowerKw) * 100)}%`}</dd>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <dt className="text-xs text-muted">30 daqiqa energiya</dt>
                    <dd className="text-lg font-bold text-navy">
                      {detail ? formatKwh(detail.readings.reduce((s, r) => s + r.energyKwh, 0)) : '…'}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted">Oxirgi aloqa: <RelTime value={sel.lastSeenAt} /></p>
                <Link href={`/app/equipment/${sel.id}`} className="inline-block text-sm font-semibold text-brand hover:underline">
                  Batafsil ma’lumot →
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-muted">Xaritada yoki ro‘yxatda uskunani tanlang.</Card>
          )}

          <Card>
            <h2 className="px-5 pt-4 text-sm font-semibold text-navy">Uskunalar ({equipment.length})</h2>
            <ul className="max-h-80 overflow-y-auto p-2">
              {equipment.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e.id)}
                    aria-pressed={e.id === selected}
                    className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface', e.id === selected && 'bg-brand-50')}
                  >
                    <span className="min-w-0 truncate font-medium text-navy">{e.name}</span>
                    <StatusBadge status={e.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {editMode && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-navy">Zonalar</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLayout((l) => ({ ...l, zones: [...l.zones, { id: `z${Date.now()}`, name: 'Yangi zona', x: 60, y: 60, width: 200, height: 140, color: 'blue' }] }))
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden /> Zona
                </Button>
              </div>
              <ul className="mt-3 space-y-3">
                {layout.zones.map((z) => (
                  <li key={z.id} className="rounded-xl border border-line p-3">
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor={`zn-${z.id}`}>Zona nomi</label>
                      <Input id={`zn-${z.id}`} value={z.name} onChange={(e) => updateZone(z.id, { name: e.target.value })} className="h-8" />
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setLayout((l) => ({ ...l, zones: l.zones.filter((x) => x.id !== z.id) }))} aria-label={`${z.name} zonasini o‘chirish`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {(['x', 'y', 'width', 'height'] as const).map((k) => (
                        <label key={k} className="text-[11px] text-muted">
                          {{ x: 'X', y: 'Y', width: 'Eni', height: 'Bo‘yi' }[k]}
                          <Input type="number" value={Math.round(z[k])} onChange={(e) => updateZone(z.id, { [k]: Number(e.target.value) || 0 })} className="h-8 px-2" />
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Zona rangi">
                      {(Object.keys(ZONE_COLORS) as Zone['color'][]).map((c) => (
                        <button key={c} type="button" role="radio" aria-checked={z.color === c} aria-label={c} onClick={() => updateZone(z.id, { color: c })} className={cn('h-6 w-6 rounded-md border-2', z.color === c ? 'border-brand' : 'border-transparent')} style={{ background: ZONE_COLORS[c].fill, outline: `1px solid ${ZONE_COLORS[c].stroke}` }} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <Button className="mt-3 w-full" onClick={saveLayout} disabled={!layoutDirty}>
                <Save className="h-4 w-4" aria-hidden /> Rejani saqlash
              </Button>
            </Card>
          )}
        </div>
      </div>

      {addOpen && (
        <EquipmentFormModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          factories={factories}
          categories={categories}
          defaultFactoryId={factoryId}
          position={{ mapX: Math.round(vb.x + vb.w / 2), mapY: Math.round(vb.y + vb.h / 2) }}
          onSaved={(eq) => {
            setAddOpen(false);
            push('success', 'Uskuna qo‘shildi va xarita markaziga joylashtirildi');
            setSelected(eq.id);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
