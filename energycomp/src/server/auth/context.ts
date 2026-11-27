import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '../db';
import { forbidden, unauthorized } from '../errors';
import { can, type OrgRoleName, type Permission } from '@/lib/permissions';
import { loadSession } from './session';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  mustChangePassword: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  industry: string;
  timezone: string;
  currency: string;
  controlMode: 'READ_ONLY' | 'SIMULATION';
  isDemo: boolean;
}

export interface AuthContext {
  sessionId: string;
  user: AuthUser;
  org: OrgSummary;
  role: OrgRoleName;
  memberships: { organizationId: string; name: string; role: OrgRoleName }[];
}

export interface SessionOnlyContext {
  sessionId: string;
  user: AuthUser;
  org: null;
  role: null;
  memberships: [];
}

/**
 * So'rov uchun autentifikatsiya konteksti. Faol tashkilot har safar membership orqali
 * qayta tekshiriladi — sessiyada saqlangan id ga ko'r-ko'rona ishonilmaydi.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | SessionOnlyContext | null> => {
  const session = await loadSession();
  if (!session) return null;
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  });
  if (memberships.length === 0) {
    return { sessionId: session.id, user: session.user, org: null, role: null, memberships: [] };
  }
  const active =
    memberships.find((m) => m.organizationId === session.activeOrganizationId) ?? memberships[0]!;
  const o = active.organization;
  return {
    sessionId: session.id,
    user: session.user,
    org: {
      id: o.id,
      name: o.name,
      slug: o.slug,
      industry: o.industry,
      timezone: o.timezone,
      currency: o.currency,
      controlMode: o.controlMode,
      isDemo: o.isDemo,
    },
    role: active.role,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      name: m.organization.name,
      role: m.role,
    })),
  };
});

/** API uchun: tashkilotga a'zo foydalanuvchi talab qilinadi. */
export async function requireOrgContext(permission?: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw unauthorized();
  if (!ctx.org) throw forbidden("Siz hech qaysi tashkilotga a'zo emassiz");
  if (permission && !can(ctx.role, permission)) throw forbidden();
  return ctx;
}

export async function requireUser(): Promise<AuthContext | SessionOnlyContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw unauthorized();
  return ctx;
}

/** Sahifalar uchun: login bo'lmasa /login ga yo'naltiradi. */
export async function requirePageContext(permission?: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!ctx.org) redirect('/login?error=no-org');
  if (permission && !can(ctx.role, permission)) redirect('/app/dashboard?denied=1');
  return ctx;
}

export function assertCan(ctx: AuthContext, permission: Permission): void {
  if (!can(ctx.role, permission)) throw forbidden();
}
