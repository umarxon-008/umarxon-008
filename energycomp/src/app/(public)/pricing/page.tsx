import type { Metadata } from 'next';
import { PlanCards } from '@/components/public/plan-cards';
import { Notice } from '@/components/ui/notice';
import { listPlans } from '@/server/services/plans';

export const metadata: Metadata = { title: 'Tariflar' };
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const plans = await listPlans().catch(() => []);
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-navy">Tariflar</h1>
        <p className="mt-4 text-lg text-muted">Kichik sexdan yirik zavodgacha. Limitlar serverda tekshiriladi.</p>
      </div>
      <Notice tone="info" title="Narxlar hali belgilanmagan" className="mx-auto mt-8 max-w-3xl">
        To‘lov tizimi ulanmagan. Ro‘yxatdan o‘tgan tashkilotlar Free tarifida boshlaydi; Pro tarifini demo rejimda yoqib
        sinash mumkin — hech qanday to‘lov olinmaydi.
      </Notice>
      <div className="mt-10">{plans.length ? <PlanCards plans={plans} /> : <p className="text-center text-muted">Tariflar ma’lumotini yuklab bo‘lmadi.</p>}</div>
    </div>
  );
}
