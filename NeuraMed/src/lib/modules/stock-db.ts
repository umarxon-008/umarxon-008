import { prisma } from "@/lib/prisma";
import { seedData, seedMovements, analyze, type StockItemRow } from "./stock";
import { dayOffset, isoDay } from "./dates";

/** Foydalanuvchining zaxirasi (birinchi ochilishda namunadan yaratiladi). */
export async function loadStock(userId: string) {
  let items = (await prisma.stockItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })) as unknown as StockItemRow[];
  if (!items.length) {
    const created: StockItemRow[] = [];
    for (const d of seedData(userId)) created.push((await prisma.stockItem.create({ data: d })) as unknown as StockItemRow);
    for (const m of seedMovements(userId, created)) await prisma.stockMovement.create({ data: m });
    items = created;
  }
  const movements = (await prisma.stockMovement.findMany({ where: { userId }, orderBy: { at: "desc" } })) as any[];
  const days = Array.from({ length: 14 }, (_, i) => isoDay(dayOffset(i - 13)));
  const outflow = days.map((d) => ({ date: d, qty: movements.filter((m) => m.type === "out" && isoDay(m.at) === d).reduce((s, m) => s + m.qty, 0) }));
  return { analysis: analyze(items), movements: movements.slice(0, 60), outflow };
}

export async function resetStock(userId: string) {
  await prisma.stockMovement.deleteMany({ where: { userId } });
  await prisma.stockItem.deleteMany({ where: { userId } });
}
