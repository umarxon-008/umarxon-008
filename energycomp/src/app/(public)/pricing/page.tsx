import type { Metadata } from 'next';
import { PlanCards } from '@/components/public/plan-cards';
import { listPlans } from '@/server/services/plans';

export const metadata: Metadata = { title: 'Tariflar' };
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const plans = await listPlans().catch(() => []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-center text-4xl font-extrabold tracking-tight text-navy">Tariflar</h1>
      <p className="mt-3 text-center text-muted">Hozircha barcha tariflar bepul sinov rejimida — to‘lov olinmaydi.</p>
      <div className="ec-fade-up mt-10">{plans.length ? <PlanCards plans={plans} /> : <p className="text-center text-muted">Tariflarni yuklab bo‘lmadi.</p>}</div>
    </div>
  );
}
