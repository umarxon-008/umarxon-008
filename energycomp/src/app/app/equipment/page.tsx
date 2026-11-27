import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requirePageContext } from '@/server/auth/context';
import { listFactories } from '@/server/services/factory';
import { listCategories } from '@/server/services/equipment';
import { getOrgPlan, getUsage } from '@/server/services/plans';
import { EquipmentList } from '@/features/equipment/equipment-list';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Uskunalar' };

export default async function EquipmentPage() {
  const ctx = await requirePageContext();
  const [factories, categories, plan, usage] = await Promise.all([
    listFactories(ctx.org.id),
    listCategories(ctx.org.id),
    getOrgPlan(ctx.org.id),
    getUsage(ctx.org.id),
  ]);
  return (
    <Suspense>
      <EquipmentList
        factories={factories.map((f) => ({ id: f.id, name: f.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        canWrite={can(ctx.role, 'equipment.write')}
        limit={{ used: usage.equipment, max: plan.maxEquipment }}
      />
    </Suspense>
  );
}
