import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, notFound } from '../errors';
import type { AuthContext } from '../auth/context';
import { hashPassword } from '../auth/password';
import { generateToken } from '../auth/tokens';
import { assertWithinLimit } from './plans';
import type { OrgRoleName } from '@/lib/permissions';

export async function listMembers(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true, mustChangePassword: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return members;
}

/**
 * A'zo qo'shish. Email xizmati ulanmagan: yangi foydalanuvchi uchun vaqtinchalik parol bir marta qaytariladi
 * va birinchi kirishda parolni almashtirish majburiy.
 */
export async function addMember(ctx: AuthContext, data: { email: string; name: string; role: OrgRoleName }) {
  return prisma.$transaction(async (tx) => {
    await assertWithinLimit(ctx.org.id, 'users', tx);
    let user = await tx.user.findUnique({ where: { email: data.email } });
    let temporaryPassword: string | null = null;
    if (user) {
      const existing = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: ctx.org.id, userId: user.id } },
      });
      if (existing) throw conflict("Bu foydalanuvchi allaqachon tashkilot a'zosi");
    } else {
      temporaryPassword = `Ec-${generateToken(9)}1`;
      user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true },
      });
    }
    const member = await tx.organizationMember.create({ data: { organizationId: ctx.org.id, userId: user.id, role: data.role } });
    await writeAudit(
      { organizationId: ctx.org.id, actorId: ctx.user.id, action: 'member.added', entityType: 'OrganizationMember', entityId: member.id, metadata: { email: data.email, role: data.role, newUser: Boolean(temporaryPassword) } },
      tx,
    );
    return { member, temporaryPassword };
  });
}

async function ownerCount(organizationId: string) {
  return prisma.organizationMember.count({ where: { organizationId, role: 'OWNER' } });
}

export async function updateMemberRole(ctx: AuthContext, memberId: string, role: OrgRoleName) {
  const m = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: ctx.org.id } });
  if (!m) throw notFound("A'zo topilmadi");
  if (m.role === 'OWNER' && role !== 'OWNER' && (await ownerCount(ctx.org.id)) <= 1) {
    throw conflict('Tashkilotda kamida bitta egasi (Owner) qolishi kerak');
  }
  const updated = await prisma.organizationMember.update({ where: { id: memberId }, data: { role } });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'member.role_changed', entityType: 'OrganizationMember', entityId: memberId, metadata: { from: m.role, to: role } });
  return updated;
}

export async function removeMember(ctx: AuthContext, memberId: string) {
  const m = await prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: ctx.org.id } });
  if (!m) throw notFound("A'zo topilmadi");
  if (m.role === 'OWNER' && (await ownerCount(ctx.org.id)) <= 1) throw conflict('Oxirgi egani olib tashlab bo‘lmaydi');
  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.delete({ where: { id: memberId } });
    // Shu tashkilotdagi faol sessiyalarni boshqa tashkilotga o'tkazish uchun tozalaymiz
    await tx.session.updateMany({ where: { userId: m.userId, activeOrganizationId: ctx.org.id }, data: { activeOrganizationId: null } });
    await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'member.removed', entityType: 'OrganizationMember', entityId: memberId, metadata: { userId: m.userId } }, tx);
  });
}

export async function updateNotificationPrefs(ctx: AuthContext, prefs: { notifyCritical: boolean; notifyWarning: boolean; notifyInfo: boolean; notifyControl: boolean }) {
  await prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: ctx.org.id, userId: ctx.user.id } },
    data: prefs,
  });
}

export async function getMyMembership(ctx: AuthContext) {
  return prisma.organizationMember.findUniqueOrThrow({
    where: { organizationId_userId: { organizationId: ctx.org.id, userId: ctx.user.id } },
  });
}
