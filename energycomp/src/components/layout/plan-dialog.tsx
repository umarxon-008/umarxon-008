'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Plan {
  key: string;
  name: string;
  priceMonthly: number | null;
  currency: string;
  maxEquipment: number;
  maxUsers: number;
  maxFactories: number;
  aiAnalysesPerDay: number;
  features: string[];
}
interface Billing {
  subscription: { plan: Plan };
  usage: { equipment: number; users: number; factories: number };
  plans: Plan[];
}

const FEATURES: Record<string, string> = {
  map2d: '2D xarita',
  map3d: '3D xarita (demo)',
  advancedAi: 'Kengaytirilgan AI',
  advancedAnalytics: 'Kengaytirilgan hisobotlar',
  integrations: 'Sensor integratsiyasi',
};

/** Yon menyu pastidagi "Tarif" kartasi bosilganda ochiladigan oyna: tariflarni solishtirish va almashtirish. */
export function PlanDialog({ open, onClose, canView, canManage, currentPlanName }: { open: boolean; onClose: () => void; canView: boolean; canManage: boolean; currentPlanName: string }) {
  const router = useRouter();
  const { push } = useToast();
  const { data, reload } = useApiData<Billing>(open && canView ? '/api/billing' : null);
  const [busy, setBusy] = useState<string | null>(null);
  const current = data?.subscription.plan.key;

  async function change(key: string) {
    setBusy(key);
    try {
      await api('/api/billing/plan', { body: { planKey: key } });
      push('success', 'Tarif yangilandi (demo — to‘lov olinmadi)');
      reload();
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Tarifni yangilash" description="Demo obuna — to‘lov olinmaydi.">
      {!canView ? (
        <p className="text-sm text-muted">
          Joriy tarif: <strong className="text-navy">{currentPlanName}</strong>. Tarifni tashkilot egasi o‘zgartiradi.
        </p>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-muted">Yuklanmoqda...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.plans.map((p) => {
            const isCurrent = p.key === current;
            const pro = p.key === 'PRO';
            const fits = data.usage.equipment <= p.maxEquipment && data.usage.users <= p.maxUsers && data.usage.factories <= p.maxFactories;
            return (
              <div key={p.key} className={cn('flex flex-col rounded-2xl border p-5', isCurrent ? 'border-brand ring-2 ring-brand/20' : 'border-line', pro && 'bg-surface')}>
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-lg font-bold text-navy">
                    {pro && <Sparkles className="h-4 w-4 text-energy" aria-hidden />} {p.name}
                  </h3>
                  {isCurrent && <Badge tone="blue">joriy</Badge>}
                </div>
                <p className="mt-1 text-sm font-semibold text-navy">{p.priceMonthly === null ? 'Narx tez orada' : `${formatMoney(p.priceMonthly, p.currency)} / oy`}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-navy">
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden />{p.maxEquipment} uskuna, {p.maxUsers} foydalanuvchi</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden />Kuniga {p.aiAnalysesPerDay} AI tahlil</li>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden />{FEATURES[f] ?? f}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>Joriy tarif</Button>
                  ) : canManage ? (
                    <>
                    <Button variant={pro ? 'success' : 'primary'} className="w-full" onClick={() => change(p.key)} loading={busy === p.key} disabled={!fits} title={!fits ? 'Joriy foydalanish bu tarif limitidan oshadi' : undefined}>
                      {pro ? 'Pro’ga o‘tish' : `${p.name}’ga o‘tish`}
                    </Button>
                    {!fits && <p className="mt-1.5 text-center text-xs text-muted">Joriy foydalanish bu tarif limitidan oshadi</p>}
                    </>
                  ) : (
                    <p className="text-center text-xs text-muted">Tashkilot egasi o‘zgartiradi</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {canView && (
        <p className="mt-4 text-center text-xs">
          <Link href="/app/billing" onClick={onClose} className="font-semibold text-brand hover:underline">Foydalanish va limitlar →</Link>
        </p>
      )}
    </Modal>
  );
}
