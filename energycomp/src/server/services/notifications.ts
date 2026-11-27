import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import { notFound } from '../errors';

type Tx = Prisma.TransactionClient | typeof prisma;

/** Tashkilot a'zolariga (ularning sozlamalariga ko'ra) bildirishnoma yaratadi. */
export async function notifyMembers(
  organizationId: string,
  n: { type: 'ALERT' | 'CONTROL' | 'SYSTEM'; severity?: 'INFO' | 'WARNING' | 'CRITICAL'; title: string; body: string; link?: string; roles?: string[] },
  tx: Tx = prisma,
) {
  const members = await tx.organizationMember.findMany({ where: { organizationId } });
  const recipients = members.filter((m) => {
    if (n.roles && !n.roles.includes(m.role)) return false;
    if (n.type === 'CONTROL') return m.notifyControl;
    if (n.type === 'ALERT') {
      if (n.severity === 'CRITICAL') return m.notifyCritical;
      if (n.severity === 'WARNING') return m.notifyWarning;
      return m.notifyInfo;
    }
    return true;
  });
  if (recipients.length === 0) return 0;
  await tx.notification.createMany({
    data: recipients.map((m) => ({
      organizationId,
      userId: m.userId,
      type: n.type,
      title: n.title.slice(0, 200),
      body: n.body.slice(0, 1000),
      link: n.link ?? null,
    })),
  });
  return recipients.length;
}

export async function listNotifications(userId: string, organizationId: string, opts: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 30;
  const where = { userId, organizationId, ...(opts.unreadOnly ? { readAt: null } : {}) };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, organizationId, readAt: null } }),
  ]);
  return { items, total, unread, page, pageSize };
}

export async function unreadCount(userId: string, organizationId: string) {
  return prisma.notification.count({ where: { userId, organizationId, readAt: null } });
}

export async function markRead(userId: string, organizationId: string, id: string) {
  const n = await prisma.notification.findFirst({ where: { id, userId, organizationId } });
  if (!n) throw notFound('Bildirishnoma topilmadi');
  await prisma.notification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
}

export async function markAllRead(userId: string, organizationId: string) {
  const res = await prisma.notification.updateMany({ where: { userId, organizationId, readAt: null }, data: { readAt: new Date() } });
  return res.count;
}
