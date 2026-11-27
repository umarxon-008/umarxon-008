import 'server-only';
import { prisma } from '../db';

export async function listAuditLogs(organizationId: string, opts: { page?: number; pageSize?: number; action?: string } = {}) {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 30;
  const where = { organizationId, ...(opts.action ? { action: { startsWith: opts.action } } : {}) };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);
  const ids = [...new Set(items.map((i) => i.actorId).filter(Boolean) as string[])];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return { items: items.map((i) => ({ ...i, actorName: i.actorId ? (names[i.actorId] ?? '—') : 'Tizim' })), total, page, pageSize };
}
