import { z } from 'zod';
import { parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { rangeQuerySchema } from '@/schemas/telemetry';
import { toCsv, csvResponse } from '@/lib/csv';
import { formatBucketLabel } from '@/lib/format';
import { toZonedDateInput } from '@/lib/time';
import { getOrgPlan } from '@/server/services/plans';
import { getExportRows, getMonitoringData, resolveRange } from '@/server/services/telemetry';
import { writeAudit } from '@/server/audit';

const schema = rangeQuerySchema.and(z.object({ mode: z.enum(['aggregated', 'raw']).default('aggregated') }));

/** CSV eksport: agregatsiyalangan (bucketlar) yoki xom o'lchovlar (max 100 000 qator). */
export const GET = route(async (req) => {
  const ctx = await requireOrgContext('reports.export');
  const q = parseQuery(req, schema);
  const plan = await getOrgPlan(ctx.org.id);
  const range = resolveRange(q, ctx.org.timezone, plan.historyDays);
  const equipmentIds = q.equipmentId ? (Array.isArray(q.equipmentId) ? q.equipmentId : [q.equipmentId]) : undefined;
  const tz = ctx.org.timezone;
  const name = `energycomp-monitoring-${toZonedDateInput(range.from, tz)}_${toZonedDateInput(range.to, tz)}`;
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'report.exported', entityType: 'Monitoring', metadata: { mode: q.mode, from: range.from.toISOString(), to: range.to.toISOString() } });

  if (q.mode === 'raw') {
    const rows = await getExportRows({ organizationId: ctx.org.id, from: range.from, to: range.to, equipmentIds });
    const csv = toCsv(
      ['timestamp_utc', 'vaqt_mahalliy', 'uskuna_kodi', 'uskuna', 'quvvat_kW', 'energiya_kWh', 'interval_s', 'manba'],
      rows.map((r) => [r.timestamp, formatBucketLabel(r.timestamp, 'hour', tz), r.equipment.code, r.equipment.name, r.powerKw, r.energyKwh, r.intervalSeconds, r.source === 'DEMO' ? 'DEMO' : 'REAL']),
    );
    return csvResponse(`${name}-raw.csv`, csv);
  }
  const data = await getMonitoringData({ organizationId: ctx.org.id, timezone: tz, currency: ctx.org.currency, range, equipmentIds, factoryId: q.factoryId });
  const csv = toCsv(
    ['davr_boshi_utc', 'davr', 'energiya_kWh', 'ortacha_quvvat_kW', 'maksimal_quvvat_kW', `xarajat_${ctx.org.currency}`, 'demo_ulushi_%', 'olchovlar'],
    data.series.map((s) => [s.bucket, formatBucketLabel(s.bucket, range.granularity, tz), s.energyKwh.toFixed(3), s.avgPowerKw.toFixed(3), s.peakKw.toFixed(3), s.cost?.toFixed(2) ?? '', (s.demoShare * 100).toFixed(0), s.readings]),
  );
  return csvResponse(`${name}.csv`, csv);
});
