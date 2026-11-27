import 'server-only';
import { prisma } from '../db';

export async function search(organizationId: string, q: string) {
  if (q.trim().length < 2) return { equipment: [], factories: [] };
  const [equipment, factories] = await Promise.all([
    prisma.equipment.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, code: true, status: true },
      take: 8,
    }),
    prisma.factory.findMany({ where: { organizationId, name: { contains: q, mode: 'insensitive' } }, select: { id: true, name: true }, take: 4 }),
  ]);
  return { equipment, factories };
}
