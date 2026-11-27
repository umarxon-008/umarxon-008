'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import { PLAN_FEATURES, type PlanFeature } from '@/schemas/plans';
import type { PlanInfo } from '@/server/services/plans';

const FEATURE_LABELS: Record<PlanFeature, string> = {
  map2d: '2D Factory Map',
  map3d: '3D xarita (keyingi bosqichda)',
  advancedAi: 'Kengaytirilgan AI (LLM)',
  advancedAnalytics: 'Kengaytirilgan analytics',
  integrations: 'Integratsiyalar (HTTP ingest)',
};

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, (used / Math.max(1, max)) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="text-muted">{label}</span><span className="font-semibold tabular-nums text-navy">{used} / {max}</span></div>
      <div className="mt-1.5 h-2 rounded-full bg-[#eaf0f8]" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-2 rounded-full ${pct >= 90 ? 'bg-orange' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BillingView({
  subscription,
  usage,
  plans,
  aiQuota,
  canManage,
  isPlatformAdmin,
}: {
  subscription: { status: string; isDemo: boolean; plan: PlanInfo };
  usage: { equipment: number; users: number; factories: number };
  plans: PlanInfo[];
  aiQuota: { used: number; limit: number };
  canManage: boolean;
  isPlatformAdmin: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanInfo | null>(null);
  const current = subscription.plan;

  async function change(key: string) {
    setBusy(key);
    try {
      await api('/api/billing/plan', { body: { planKey: key } });
      push('success', 'Tarif demo rejimda o‘zgartirildi. To‘lov olinmadi.');
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function savePlan() {
    if (!editing) return;
    try {
      await api(`/api/plans/${editing.key}`, { method: 'PUT', body: { ...editing, key: undefined, id: undefined } });
      push('success', 'Tarif sozlamalari saqlandi');
      setEditing(null);
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader title="Tarif va obuna" />
      <Notice tone="demo" title="Demo obuna" className="mb-5">
        To‘lov provayderi ulanmagan — real to‘lov qabul qilinmaydi. Tarifni almashtirish faqat demo rejimda limit va imkoniyatlarni o‘zgartiradi. Limitlar serverda tekshiriladi.
      </Notice>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Joriy tarif" action={<Badge tone="violet">{subscription.isDemo ? 'DEMO' : subscription.status}</Badge>} />
          <CardBody className="space-y-4">
            <p className="text-2xl font-bold text-navy">{current.name}</p>
            <p className="text-sm text-muted">{current.description}</p>
            <Usage label="Uskunalar" used={usage.equipment} max={current.maxEquipment} />
            <Usage label="Foydalanuvchilar" used={usage.users} max={current.maxUsers} />
            <Usage label="Zavodlar" used={usage.factories} max={current.maxFactories} />
            <Usage label="Bugungi AI tahlillar" used={aiQuota.used} max={aiQuota.limit} />
            <p className="text-xs text-muted">Tarix: {current.historyDays} kun</p>
          </CardBody>
        </Card>
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
          {plans.map((p) => (
            <Card key={p.key} className={p.key === current.key ? 'ring-2 ring-brand' : ''}>
              <CardBody className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy">{p.name}</h2>
                  {p.key === current.key && <Badge tone="blue">joriy</Badge>}
                </div>
                <p className="mt-1 text-xl font-bold text-navy">{p.priceMonthly === null ? 'Narx belgilanmagan' : `${formatMoney(p.priceMonthly, p.currency)} / oy`}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted">
                  <li>{p.maxFactories} zavod · {p.maxEquipment} uskuna · {p.maxUsers} foydalanuvchi</li>
                  <li>Kuniga {p.aiAnalysesPerDay} AI tahlil · {p.historyDays} kunlik tarix</li>
                  {p.features.map((f) => <li key={f} className="flex gap-1.5"><Check className="h-4 w-4 text-energy" aria-hidden />{FEATURE_LABELS[f]}</li>)}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {canManage && p.key !== current.key && <Button onClick={() => change(p.key)} loading={busy === p.key}>Demo rejimda o‘tish</Button>}
                  {isPlatformAdmin && <Button variant="outline" onClick={() => setEditing({ ...p })}>Narx va limitlar</Button>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Tarifni sozlash: ${editing?.name ?? ''}`}
        description="Faqat platforma administratori. O‘zgarish barcha tashkilotlarga ta’sir qiladi va audit qilinadi."
        size="lg"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Bekor qilish</Button><Button onClick={savePlan}>Saqlash</Button></>}
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomi">{(p) => <Input {...p} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />}</Field>
            <Field label="Oylik narx (bo‘sh — belgilanmagan)">{(p) => <Input {...p} type="number" min="0" value={editing.priceMonthly ?? ''} onChange={(e) => setEditing({ ...editing, priceMonthly: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
            <Field label="Tavsif" className="sm:col-span-2">{(p) => <Input {...p} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />}</Field>
            <Field label="Valyuta">{(p) => <Input {...p} value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} />}</Field>
            {(['maxFactories', 'maxEquipment', 'maxUsers', 'aiAnalysesPerDay', 'historyDays'] as const).map((k) => (
              <Field key={k} label={{ maxFactories: 'Maks. zavodlar', maxEquipment: 'Maks. uskunalar', maxUsers: 'Maks. foydalanuvchilar', aiAnalysesPerDay: 'AI tahlil / kun', historyDays: 'Tarix (kun)' }[k]}>
                {(p) => <Input {...p} type="number" min="0" value={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: Number(e.target.value) })} />}
              </Field>
            ))}
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium text-navy">Imkoniyatlar</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLAN_FEATURES.map((f) => (
                  <Checkbox key={f} label={FEATURE_LABELS[f]} checked={editing.features.includes(f)} onChange={(e) => setEditing({ ...editing, features: e.target.checked ? [...editing.features, f] : editing.features.filter((x) => x !== f) })} />
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </Modal>
    </div>
  );
}
