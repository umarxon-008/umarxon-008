import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requirePageContext } from '@/server/auth/context';
import { equipmentRepo } from '@/server/repositories/equipment';
import { aiProviderStatus } from '@/server/providers/ai';
import { getAiQuota, hasFeature } from '@/server/services/plans';
import { can } from '@/lib/permissions';
import { InspectorView } from '@/features/inspector/inspector-view';

export const metadata: Metadata = { title: 'AI Inspector' };

export default async function InspectorPage() {
  const ctx = await requirePageContext();
  const [equipment, quota, advancedAi] = await Promise.all([
    equipmentRepo.list(ctx.org.id),
    getAiQuota(ctx.org.id, ctx.org.timezone),
    hasFeature(ctx.org.id, 'advancedAi'),
  ]);
  return (
    <Suspense>
      <InspectorView
        timezone={ctx.org.timezone}
        equipmentOptions={equipment.map((e) => ({ id: e.id, name: e.name }))}
        perms={{
          update: can(ctx.role, 'alert.update'),
          run: can(ctx.role, 'inspector.run'),
          analyze: can(ctx.role, 'ai.analyze'),
          feedback: can(ctx.role, 'ai.feedback'),
        }}
        ai={{ ...aiProviderStatus(), planAllowsLlm: advancedAi }}
        quota={{ used: quota.used, limit: quota.limit }}
      />
    </Suspense>
  );
}
