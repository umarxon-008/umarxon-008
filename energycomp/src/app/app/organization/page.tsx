import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { getOrganizationDetails } from '@/server/services/organization';
import { listFactories } from '@/server/services/factory';
import { getOrgPlan } from '@/server/services/plans';
import { can } from '@/lib/permissions';
import { toZonedDateInput } from '@/lib/time';
import { OrganizationView, type OrgData } from '@/features/organization/organization-view';

export const metadata: Metadata = { title: 'Korxona' };

export default async function OrganizationPage() {
  const ctx = await requirePageContext();
  const [org, factories, plan] = await Promise.all([getOrganizationDetails(ctx.org.id), listFactories(ctx.org.id), getOrgPlan(ctx.org.id)]);
  const tz = org.timezone;
  const data: OrgData = JSON.parse(
    JSON.stringify({
      ...org,
      baselineStartInput: org.baselineStart ? toZonedDateInput(org.baselineStart, tz) : null,
      baselineEndInput: org.baselineEnd ? toZonedDateInput(org.baselineEnd, tz) : null,
    }),
  );
  return (
    <OrganizationView
      org={data}
      factories={JSON.parse(JSON.stringify(factories))}
      factoryLimit={{ used: factories.length, max: plan.maxFactories }}
      perms={{
        orgUpdate: can(ctx.role, 'org.update'),
        tariff: can(ctx.role, 'tariff.update'),
        factoryWrite: can(ctx.role, 'factory.write'),
        factoryDelete: can(ctx.role, 'factory.delete'),
        category: can(ctx.role, 'category.write'),
        control: can(ctx.role, 'control.configure'),
        audit: can(ctx.role, 'audit.view'),
      }}
    />
  );
}
