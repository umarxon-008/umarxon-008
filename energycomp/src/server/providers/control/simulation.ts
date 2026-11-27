import 'server-only';
import { prisma } from '@/server/db';
import type { ControlAdapter, ControlCommand, ControlResult } from './types';

/**
 * Simulyatsiya adapteri: faqat DEMO uskunaning simulyatsiya holatini o'zgartiradi.
 * Hech qanday real uskunaga buyruq yubormaydi.
 */
export const simulationControlAdapter: ControlAdapter = {
  id: 'simulation',
  isReal: false,
  async execute(cmd: ControlCommand): Promise<ControlResult> {
    const eq = await prisma.equipment.findUnique({ where: { id: cmd.equipmentId }, select: { dataSource: true } });
    if (!eq) return { ok: false, simulated: true, message: 'Uskuna topilmadi' };
    if (eq.dataSource !== 'DEMO') {
      return {
        ok: false,
        simulated: true,
        message: "Real ma'lumot manbali uskuna uchun boshqaruv adapteri ulanmagan. Buyruq yuborilmadi.",
      };
    }
    await prisma.equipment.update({
      where: { id: cmd.equipmentId },
      data:
        cmd.action === 'STOP'
          ? { simulatedState: 'STOPPED', simulatedStateAt: new Date() }
          : { simulatedState: null, simulatedStateAt: null },
    });
    return {
      ok: true,
      simulated: true,
      message:
        cmd.action === 'STOP'
          ? "Simulyatsiya: demo uskuna holati \"to'xtatilgan\" deb belgilandi. Real uskunaga buyruq yuborilmadi."
          : 'Simulyatsiya: demo uskuna odatiy demo rejimiga qaytarildi. Real uskunaga buyruq yuborilmadi.',
    };
  },
};

/** Real adapter mavjud emas — bu funksiya doim null qaytaradi. */
export function getRealControlAdapter(): ControlAdapter | null {
  return null;
}
