import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from './db';

type Tx = Prisma.TransactionClient | typeof prisma;

export async function writeAudit(
  entry: {
    organizationId?: string | null;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ip?: string | null;
  },
  tx: Tx = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      organizationId: entry.organizationId ?? null,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
      ip: entry.ip ?? null,
    },
  });
}
