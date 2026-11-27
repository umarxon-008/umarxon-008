import { Check, Clock, X } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const FEATURE_ROWS: { key: string; label: string; soon?: boolean }[] = [
  { key: 'map2d', label: '2D Factory Map' },
  { key: 'map3d', label: '3D xarita', soon: true },
  { key: 'advancedAi', label: 'Kengaytirilgan AI Inspector (LLM tahlil)' },
  { key: 'advancedAnalytics', label: 'Kengaytirilgan analytics (kategoriya, soatlik profil)' },
  { key: 'integrations', label: 'Integratsiyalar (HTTP ingest API)' },
];

export function PlanCards({ plans, ctaHref = '/register' }: { plans: PublicPlan[]; ctaHref?: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((p) => {
        const pro = p.key === 'PRO';
        return (
          <div
            key={p.key}
            className={cn(
              'flex flex-col rounded-3xl border p-6 sm:p-8',
              pro ? 'border-brand bg-navy text-white shadow-pop' : 'border-line bg-white shadow-card',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold">{p.name}</h3>
              {pro && <Badge tone="green">Kengaytirilgan</Badge>}
            </div>
            <p className={cn('mt-2 text-sm', pro ? 'text-[#c5d2ea]' : 'text-muted')}>{p.description}</p>
            <p className="mt-5 text-3xl font-extrabold">
              {p.priceMonthly === null ? (
                <span className="text-2xl">Narx belgilanmagan</span>
              ) : p.priceMonthly === 0 ? (
                'Bepul'
              ) : (
                <>
                  {formatMoney(p.priceMonthly, p.currency)}
                  <span className="text-base font-medium"> / oy</span>
                </>
              )}
            </p>
            {p.priceMonthly === null && (
              <p className={cn('mt-1 text-xs', pro ? 'text-[#c5d2ea]' : 'text-muted')}>
                Narxlar hali e’lon qilinmagan. MVP davrida obuna demo rejimda ishlaydi.
              </p>
            )}
            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> {p.maxFactories} ta zavod, {p.maxEquipment} ta uskuna</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> {p.maxUsers} ta foydalanuvchi</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> Kuniga {p.aiAnalysesPerDay} ta AI tahlil</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> {p.historyDays} kunlik tarix</li>
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-energy" aria-hidden /> Energy Monitoring va asosiy analytics</li>
              {FEATURE_ROWS.map((f) => {
                const has = p.features.includes(f.key);
                return (
                  <li key={f.key} className={cn('flex gap-2', !has && (pro ? 'text-[#8fa0bf]' : 'text-[#94a3b8]'))}>
                    {has ? (
                      f.soon ? <Clock className="h-4 w-4 shrink-0 text-amber" aria-hidden /> : <Check className="h-4 w-4 shrink-0 text-energy" aria-hidden />
                    ) : (
                      <X className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span>
                      {f.label}
                      {has && f.soon && <span className="ml-1 text-xs font-semibold text-amber">(keyingi bosqichda)</span>}
                      {!has && <span className="sr-only"> — mavjud emas</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto pt-8">
              <LinkButton href={ctaHref} variant={pro ? 'success' : 'primary'} size="lg" className="w-full">
                {pro ? 'Pro’ni demo rejimda sinash' : 'Bepul boshlash'}
              </LinkButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
