import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import type { Granularity } from '@/lib/time';

export interface BucketRow {
  bucket: Date;
  energyKwh: number;
  peakKw: number;
  readings: number;
  demoReadings: number;
}

const TRUNC: Record<Granularity, string> = { hour: 'hour', day: 'day', week: 'week', month: 'month' };

function equipmentFilter(equipmentIds?: string[]) {
  return equipmentIds && equipmentIds.length
    ? Prisma.sql`AND "equipmentId" IN (${Prisma.join(equipmentIds)})`
    : Prisma.empty;
}

/**
 * Vaqt bo'yicha agregatsiya (tashkilot vaqt zonasida). peakKw — bir lahzadagi uskunalar
 * quvvatlari yig'indisining maksimumi.
 */
export async function aggregateSeries(params: {
  organizationId: string;
  from: Date;
  to: Date;
  granularity: Granularity;
  timezone: string;
  equipmentIds?: string[];
}): Promise<BucketRow[]> {
  const unit = TRUNC[params.granularity];
  const rows = await prisma.$queryRaw<
    { bucket: Date; energy: number | null; peak: number | null; readings: bigint; demo: bigint }[]
  >(Prisma.sql`
    WITH per_ts AS (
      SELECT "timestamp", SUM("energyKwh") AS energy, SUM("powerKw") AS power,
             COUNT(*) AS readings, COUNT(*) FILTER (WHERE "source" = 'DEMO') AS demo
      FROM "EquipmentTelemetry"
      WHERE "organizationId" = ${params.organizationId}
        AND "timestamp" >= ${params.from} AND "timestamp" < ${params.to}
        ${equipmentFilter(params.equipmentIds)}
      GROUP BY "timestamp"
    )
    SELECT (date_trunc(${unit}, "timestamp" AT TIME ZONE ${params.timezone}) AT TIME ZONE ${params.timezone}) AS bucket,
           SUM(energy)::float8 AS energy, MAX(power)::float8 AS peak,
           SUM(readings)::bigint AS readings, SUM(demo)::bigint AS demo
    FROM per_ts
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({
    bucket: r.bucket,
    energyKwh: r.energy ?? 0,
    peakKw: r.peak ?? 0,
    readings: Number(r.readings),
    demoReadings: Number(r.demo),
  }));
}

export interface EquipmentTotalRow {
  equipmentId: string;
  energyKwh: number;
  avgPowerKw: number;
  maxPowerKw: number;
  readings: number;
}

export async function totalsByEquipment(params: {
  organizationId: string;
  from: Date;
  to: Date;
  equipmentIds?: string[];
}): Promise<EquipmentTotalRow[]> {
  const rows = await prisma.$queryRaw<
    { equipmentId: string; energy: number; avgp: number; maxp: number; readings: bigint }[]
  >(Prisma.sql`
    SELECT "equipmentId", SUM("energyKwh")::float8 AS energy,
           (SUM("powerKw" * "intervalSeconds") / NULLIF(SUM("intervalSeconds"), 0))::float8 AS avgp,
           MAX("powerKw")::float8 AS maxp, COUNT(*)::bigint AS readings
    FROM "EquipmentTelemetry"
    WHERE "organizationId" = ${params.organizationId}
      AND "timestamp" >= ${params.from} AND "timestamp" < ${params.to}
      ${equipmentFilter(params.equipmentIds)}
    GROUP BY "equipmentId"
  `);
  return rows.map((r) => ({
    equipmentId: r.equipmentId,
    energyKwh: r.energy ?? 0,
    avgPowerKw: r.avgp ?? 0,
    maxPowerKw: r.maxp ?? 0,
    readings: Number(r.readings),
  }));
}

export async function totalEnergy(params: { organizationId: string; from: Date; to: Date; equipmentIds?: string[] }) {
  const rows = await prisma.$queryRaw<{ energy: number | null; demo: bigint; total: bigint }[]>(Prisma.sql`
    SELECT SUM("energyKwh")::float8 AS energy, COUNT(*) FILTER (WHERE "source"='DEMO')::bigint AS demo, COUNT(*)::bigint AS total
    FROM "EquipmentTelemetry"
    WHERE "organizationId" = ${params.organizationId}
      AND "timestamp" >= ${params.from} AND "timestamp" < ${params.to}
      ${equipmentFilter(params.equipmentIds)}
  `);
  const r = rows[0];
  return { energyKwh: r?.energy ?? 0, demoReadings: Number(r?.demo ?? 0), readings: Number(r?.total ?? 0) };
}

/** Soat bo'yicha yuklama profili (0..23, tashkilot zonasida) — o'rtacha quvvat. */
export async function hourlyProfile(params: { organizationId: string; from: Date; to: Date; timezone: string }) {
  const rows = await prisma.$queryRaw<{ hour: number; energy: number; days: bigint }[]>(Prisma.sql`
    SELECT EXTRACT(HOUR FROM "timestamp" AT TIME ZONE ${params.timezone})::int AS hour,
           SUM("energyKwh")::float8 AS energy,
           COUNT(DISTINCT date_trunc('day', "timestamp" AT TIME ZONE ${params.timezone}))::bigint AS days
    FROM "EquipmentTelemetry"
    WHERE "organizationId" = ${params.organizationId}
      AND "timestamp" >= ${params.from} AND "timestamp" < ${params.to}
    GROUP BY 1 ORDER BY 1
  `);
  return rows.map((r) => ({ hour: r.hour, avgPowerKw: Number(r.days) > 0 ? r.energy / Number(r.days) : 0 }));
}
