import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, featureUnavailable, forbidden, notFound } from '../errors';
import type { AuthContext } from '../auth/context';
import { getRealControlAdapter, simulationControlAdapter } from '../providers/control/simulation';
import { notifyMembers } from './notifications';
import { CONTROL_ACTION_LABELS } from '@/lib/labels';

/**
 * Smart Control oqimi: so'rov (Engineer/Owner) → inson tasdig'i (boshqa Owner/Manager) → adapter.
 * MVPda faqat SIMULATION; READ_ONLY rejimida so'rov qabul qilinmaydi. AI hech qachon bu funksiyani chaqirmaydi.
 */
export async function getControlStatus(organizationId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { controlMode: true } });
  return {
    mode: org.controlMode,
    realAdapterAvailable: getRealControlAdapter() !== null,
    simulationOnly: true,
  };
}

export async function requestControl(
  ctx: AuthContext,
  data: { equipmentId: string; action: 'STOP' | 'START'; reason: string },
) {
  const status = await getControlStatus(ctx.org.id);
  if (status.mode === 'READ_ONLY') {
    throw featureUnavailable('Tashkilot READ-ONLY rejimida. Boshqaruv so‘rovlari o‘chirilgan.');
  }
  const eq = await prisma.equipment.findFirst({ where: { id: data.equipmentId, organizationId: ctx.org.id } });
  if (!eq) throw notFound('Uskuna topilmadi');
  if (eq.dataSource !== 'DEMO') {
    throw featureUnavailable("Real uskuna uchun boshqaruv adapteri ulanmagan. EnergyComp bu uskunaga buyruq yubora olmaydi.");
  }
  const pending = await prisma.controlRequest.findFirst({ where: { equipmentId: eq.id, status: 'PENDING' } });
  if (pending) throw conflict('Bu uskuna uchun tasdiq kutayotgan so‘rov mavjud');
  const req = await prisma.$transaction(async (tx) => {
    const r = await tx.controlRequest.create({
      data: {
        organizationId: ctx.org.id,
        equipmentId: eq.id,
        action: data.action,
        reason: data.reason,
        mode: 'SIMULATION',
        requestedById: ctx.user.id,
      },
    });
    await writeAudit(
      { organizationId: ctx.org.id, actorId: ctx.user.id, action: 'control.requested', entityType: 'ControlRequest', entityId: r.id, metadata: { equipmentId: eq.id, action: data.action, reason: data.reason, mode: 'SIMULATION' } },
      tx,
    );
    await notifyMembers(
      ctx.org.id,
      {
        type: 'CONTROL',
        title: `Tasdiq kerak: ${eq.name} — ${CONTROL_ACTION_LABELS[data.action]} (simulyatsiya)`,
        body: `${ctx.user.name}: ${data.reason}`,
        link: `/app/equipment/${eq.id}`,
        roles: ['OWNER', 'MANAGER'],
      },
      tx,
    );
    return r;
  });
  return req;
}

export async function reviewControl(ctx: AuthContext, id: string, decision: 'APPROVE' | 'REJECT', note?: string) {
  const req = await prisma.controlRequest.findFirst({ where: { id, organizationId: ctx.org.id }, include: { equipment: true } });
  if (!req) throw notFound('So‘rov topilmadi');
  if (req.status !== 'PENDING') throw conflict('So‘rov allaqachon ko‘rib chiqilgan');
  if (req.requestedById === ctx.user.id) {
    throw forbidden('O‘z so‘rovingizni o‘zingiz tasdiqlay olmaysiz — ikkinchi vakolatli shaxs tasdig‘i kerak');
  }
  const now = new Date();
  if (decision === 'REJECT') {
    await prisma.$transaction(async (tx) => {
      await tx.controlRequest.update({ where: { id }, data: { status: 'REJECTED', reviewedById: ctx.user.id, reviewedAt: now, reviewNote: note ?? null } });
      await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'control.rejected', entityType: 'ControlRequest', entityId: id, metadata: { note: note ?? null } }, tx);
    });
    return prisma.controlRequest.findUniqueOrThrow({ where: { id } });
  }
  const status = await getControlStatus(ctx.org.id);
  if (status.mode !== 'SIMULATION') throw featureUnavailable('Simulyatsiya rejimi o‘chirilgan');
  const result = await simulationControlAdapter.execute({ equipmentId: req.equipmentId, action: req.action, requestId: id });
  await prisma.$transaction(async (tx) => {
    await tx.controlRequest.update({
      where: { id },
      data: {
        status: result.ok ? 'EXECUTED_SIMULATED' : 'FAILED',
        reviewedById: ctx.user.id,
        reviewedAt: now,
        reviewNote: note ?? null,
        executedAt: result.ok ? now : null,
        result: result.message,
      },
    });
    await writeAudit(
      { organizationId: ctx.org.id, actorId: ctx.user.id, action: result.ok ? 'control.executed_simulated' : 'control.failed', entityType: 'ControlRequest', entityId: id, metadata: { adapter: simulationControlAdapter.id, simulated: true, message: result.message } },
      tx,
    );
    await notifyMembers(
      ctx.org.id,
      { type: 'CONTROL', title: `${req.equipment.name}: ${result.ok ? 'simulyatsiyada bajarildi' : 'bajarilmadi'}`, body: result.message, link: `/app/equipment/${req.equipmentId}` },
      tx,
    );
  });
  return prisma.controlRequest.findUniqueOrThrow({ where: { id } });
}

export async function cancelControl(ctx: AuthContext, id: string) {
  const req = await prisma.controlRequest.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!req) throw notFound('So‘rov topilmadi');
  if (req.status !== 'PENDING') throw conflict('Faqat kutilayotgan so‘rovni bekor qilish mumkin');
  if (req.requestedById !== ctx.user.id && ctx.role !== 'OWNER') throw forbidden();
  await prisma.controlRequest.update({ where: { id }, data: { status: 'CANCELLED', reviewedById: ctx.user.id, reviewedAt: new Date() } });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'control.cancelled', entityType: 'ControlRequest', entityId: id });
}

export async function listControlRequests(organizationId: string, equipmentId?: string) {
  const rows = await prisma.controlRequest.findMany({
    where: { organizationId, ...(equipmentId ? { equipmentId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { equipment: { select: { id: true, name: true } } },
  });
  const ids = [...new Set(rows.flatMap((r) => [r.requestedById, r.reviewedById]).filter(Boolean) as string[])];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    ...r,
    requestedByName: names[r.requestedById] ?? '—',
    reviewedByName: r.reviewedById ? (names[r.reviewedById] ?? '—') : null,
  }));
}
