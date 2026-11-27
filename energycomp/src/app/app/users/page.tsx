import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { listMembers } from '@/server/services/members';
import { getOrgPlan } from '@/server/services/plans';
import { can } from '@/lib/permissions';
import { UsersView } from '@/features/users/users-view';

export const metadata: Metadata = { title: 'Foydalanuvchilar' };

export default async function UsersPage() {
  const ctx = await requirePageContext('users.view');
  const [members, plan] = await Promise.all([listMembers(ctx.org.id), getOrgPlan(ctx.org.id)]);
  return (
    <UsersView
      members={JSON.parse(JSON.stringify(members))}
      canManage={can(ctx.role, 'users.manage')}
      currentUserId={ctx.user.id}
      limit={{ used: members.length, max: plan.maxUsers }}
    />
  );
}
