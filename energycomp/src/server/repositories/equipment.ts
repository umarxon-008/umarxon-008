import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';

/** Tenant doirasidagi uskuna so'rovlari. organizationId har doim majburiy. */
export const equipmentRepo = {
  findById(organizationId: string, id: string) {
    return prisma.equipment.findFirst({
      where: { id, organizationId },
      include: { factory: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
    });
  },
  list(organizationId: string, where: Prisma.EquipmentWhereInput = {}, orderBy?: Prisma.EquipmentOrderByWithRelationInput, skip?: number, take?: number) {
    return prisma.equipment.findMany({
      where: { ...where, organizationId },
      include: { factory: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } },
      orderBy: orderBy ?? { name: 'asc' },
      skip,
      take,
    });
  },
  count(organizationId: string, where: Prisma.EquipmentWhereInput = {}) {
    return prisma.equipment.count({ where: { ...where, organizationId } });
  },
};
