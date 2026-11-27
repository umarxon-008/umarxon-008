import { parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { rangeQuerySchema } from '@/schemas/telemetry';
import { csvResponse, toCsv } from '@/lib/csv';
import { toZonedDateInput } from '@/lib/time';
import { getAnalytics } from '@/server/services/analytics';
import { getOrgPlan } from '@/server/services/plans';
import { resolveRange } from '@/server/services/telemetry';
import { writeAudit } from '@/server/audit';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext('reports.export');
  const q = parseQuery(req, rangeQuerySchema);
  const plan = await getOrgPlan(ctx.org.id);
  const range = resolveRange(q, ctx.org.timezone, plan.historyDays);
  const data = await getAnalytics({ organizationId: ctx.org.id, timezone: ctx.org.timezone, currency: ctx.org.currency, range });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'report.exported', entityType: 'Analytics', metadata: { from: data.range.from, to: data.range.to } });
  const csv = toCsv(
    ['uskuna_kodi', 'uskuna', 'kategoriya', 'energiya_kWh', 'ulush_%', 'oldingi_davr_kWh', 'ozgarish_%', 'ortacha_quvvat_kW', 'maksimal_quvvat_kW'],
    data.byEquipment.map((e) => [e.code, e.name, e.category, e.energyKwh.toFixed(3), (e.share * 100).toFixed(1), e.previousEnergyKwh.toFixed(3), e.change === null ? '' : e.change.toFixed(1), e.avgPowerKw.toFixed(3), e.maxPowerKw.toFixed(3)]),
  );
  const tz = ctx.org.timezone;
  return csvResponse(`energycomp-analytics-${toZonedDateInput(range.from, tz)}_${toZonedDateInput(range.to, tz)}.csv`, csv);
});
