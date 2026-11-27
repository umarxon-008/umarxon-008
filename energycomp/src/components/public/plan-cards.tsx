import { Check } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PublicPlan {
  key: string;
  name: string;
  description: string;
  priceMonthly: number | null;
  currency: string;
  maxFactories: number;
  maxEquipment: number;
  maxUsers: number;
  aiAnalysesPerDay: number;
  historyDays: number;
  features: string[];
}

const FEATURE_LABELS: Record<string, string> = {
  map2d: '2D xarita',
  map3d: '3D xarita (tez orada)',
  advancedAi: 'Kengaytirilgan AI',
  advancedAnalytics: 'Kengaytirilgan hisobotlar',
  integrations: 'Sensor integratsiyasi',
};

export function PlanCards({ plans, ctaHref = '/register' }: { plans: PublicPlan[]; ctaHref?: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((p) => {
        const pro = p.key === 'PRO';
        const lines = [
          `${p.maxEquipment} ta uskuna, ${p.maxUsers} ta foydalanuvchi`,
          `Kuniga ${p.aiAnalysesPerDay} ta AI tahlil`,
          ...p.features.map((f) => FEATURE_LABELS[f] ?? f),
        ];
        return (
          <div
            key={p.key}
            className={cn(
              'flex flex-col rounded-3xl border p-7 transition-transform duration-300 hover:-translate-y-1',
              pro ? 'border-navy bg-navy text-white shadow-pop' : 'border-line bg-white shadow-card',
            )}
          >
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="mt-3 text-2xl font-extrabold">
              {p.priceMonthly === null ? 'Narx tez orada' : p.priceMonthly === 0 ? 'Bepul' : `${formatMoney(p.priceMonthly, p.currency)} / oy`}
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> {l}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <LinkButton href={ctaHref} variant={pro ? 'success' : 'primary'} size="lg" className="w-full">
                {pro ? 'Pro’ni sinash' : 'Bepul boshlash'}
              </LinkButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
