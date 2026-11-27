import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cookieJar, hasDb, params, req } from '../helpers';

vi.mock('next/headers', async () => (await import('../helpers')).nextHeadersMock);

const P = params({});
const MIN = 60_000;

describe.skipIf(!hasDb)('AI Inspector, ingest, monitoring, eksport va Smart Control', async () => {
  const register = await import('@/app/api/auth/register/route');
  const login = await import('@/app/api/auth/login/route');
  const integrations = await import('@/app/api/integrations/route');
  const ingest = await import('@/app/api/ingest/route');
  const alerts = await import('@/app/api/alerts/route');
  const alertId = await import('@/app/api/alerts/[id]/route');
  const analyzeRoute = await import('@/app/api/ai/analyze/route');
  const monitoring = await import('@/app/api/monitoring/route');
  const monitoringExport = await import('@/app/api/monitoring/export/route');
  const control = await import('@/app/api/control/route');
  const controlId = await import('@/app/api/control/[id]/route');
  const members = await import('@/app/api/members/route');
  const { prisma } = await import('@/server/db');
  const { runInspection } = await import('@/server/services/inspector');
  const { syncOrganizationTelemetry } = await import('@/server/services/telemetry-sync');
  const { resetRateLimits } = await import('@/server/rate-limit');

  const json = async (r: Response) => (await r.json()) as { ok: boolean; data: any; error?: { code: string } } // eslint-disable-line @typescript-eslint/no-explicit-any -- test javoblari;
  let orgId = '';
  let realEq = '';
  let demoEq = '';
  let token = '';
  const now = new Date();
  now.setUTCSeconds(0, 0);

  async function loginAs(email: string, password = 'Parol1234') {
    cookieJar.clear();
    expect((await login.POST(req('/api/auth/login', { body: { email, password } }), P)).status).toBe(200);
  }

  beforeAll(async () => {
    resetRateLimits();
    cookieJar.clear();
    const r = await json(
      await register.POST(
        req('/api/auth/register', { body: { name: 'Owner Ins', email: 'ins@test.uz', password: 'Parol1234', confirmPassword: 'Parol1234', organizationName: 'Inspector Zavod', industry: 'Boshqa', acceptTerms: true } }),
        P,
      ),
    );
    orgId = r.data.organizationId;
    const factory = await prisma.factory.findFirstOrThrow({ where: { organizationId: orgId } });
    const real = await prisma.equipment.create({
      data: { organizationId: orgId, factoryId: factory.id, name: 'Real CNC', code: 'R-1', nominalPowerKw: 20, dataSource: 'REAL', sensorId: 'GW-TEST-1', hasProductionSignal: true },
    });
    realEq = real.id;
    const demo = await prisma.equipment.create({
      data: { organizationId: orgId, factoryId: factory.id, name: 'Demo kompressor', code: 'D-1', nominalPowerKw: 30, dataSource: 'DEMO', demoConfig: { profile: 'continuous' } },
    });
    demoEq = demo.id;
  });

  it('Free tarifida HTTP ingest token yaratib bo‘lmaydi, Pro’da bo‘ladi', async () => {
    expect((await integrations.POST(req('/api/integrations', { body: { name: 'Gateway' } }), P)).status).toBe(402);
    const pro = await prisma.plan.findUniqueOrThrow({ where: { key: 'PRO' } });
    await prisma.subscription.update({ where: { organizationId: orgId }, data: { planId: pro.id } });
    const r = await json(await integrations.POST(req('/api/integrations', { body: { name: 'Gateway' } }), P));
    token = r.data.token;
    expect(token).toMatch(/^ec_/);
    const stored = await prisma.integration.findFirstOrThrow({ where: { organizationId: orgId, type: 'HTTP_INGEST' } });
    expect(stored.tokenHash).not.toBe(token);
  });

  it('HTTP ingest: REAL o‘lchovlar saqlanadi, noma’lum sensor rad etiladi, token tekshiriladi', async () => {
    const readings = Array.from({ length: 8 }, (_, i) => ({
      sensorId: 'GW-TEST-1',
      timestamp: new Date(now.getTime() - (7 - i) * MIN).toISOString(),
      powerKw: 12,
      intervalSeconds: 60,
    }));
    const bad = await ingest.POST(new Request('http://localhost/api/ingest', { method: 'POST', headers: { authorization: 'Bearer ec_wrong' }, body: JSON.stringify({ readings }) }));
    expect(bad.status).toBe(401);
    const r = await json(
      await ingest.POST(
        new Request('http://localhost/api/ingest', {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ readings: [...readings, { sensorId: 'UNKNOWN', timestamp: now.toISOString(), powerKw: 1 }] }),
        }),
      ),
    );
    expect(r.data.accepted).toBe(8);
    expect(r.data.rejected).toHaveLength(1);
    const rows = await prisma.equipmentTelemetry.findMany({ where: { equipmentId: realEq } });
    expect(rows.every((x) => x.source === 'REAL')).toBe(true);
    expect(rows.reduce((s, x) => s + x.energyKwh, 0)).toBeCloseTo(8 * 0.2, 6); // 12 kW × 1 daqiqa = 0.2 kWh
  });

  it('5 daqiqalik qoida alert yaratadi; qayta tekshiruv dublikat yaratmaydi', async () => {
    const first = await runInspection(orgId, now);
    expect(first.created).toBeGreaterThanOrEqual(1);
    const a = await prisma.alert.findFirstOrThrow({ where: { equipmentId: realEq, rule: 'NO_PRODUCTION_SIGNAL' } });
    expect(a.title).toContain('ishlab chiqarish signali kelmadi');
    expect(a.source).toBe('REAL');
    await runInspection(orgId, now);
    expect(await prisma.alert.count({ where: { equipmentId: realEq, rule: 'NO_PRODUCTION_SIGNAL' } })).toBe(1);
    expect(await prisma.notification.count({ where: { organizationId: orgId, type: 'ALERT' } })).toBeGreaterThanOrEqual(1);
    const eq = await prisma.equipment.findUniqueOrThrow({ where: { id: realEq } });
    expect(eq.status).toBe('WARNING');
  });

  it('alert holati: ko‘rib chiqildi → hal qilindi; kim va qachon saqlanadi; noto‘g‘ri o‘tish rad etiladi', async () => {
    const list = await json(await alerts.GET(req('/api/alerts?status=OPEN'), P));
    const id = list.data.items.find((x: { rule: string }) => x.rule === 'NO_PRODUCTION_SIGNAL').id as string;
    const ack = await json(await alertId.PATCH(req(`/api/alerts/${id}`, { method: 'PATCH', body: { status: 'ACKNOWLEDGED', note: 'Tekshirilmoqda' } }), params({ id })));
    expect(ack.data.status).toBe('ACKNOWLEDGED');
    expect(ack.data.reviewedByName).toBe('Owner Ins');
    const res = await json(await alertId.PATCH(req(`/api/alerts/${id}`, { method: 'PATCH', body: { status: 'RESOLVED' } }), params({ id })));
    expect(res.data.status).toBe('RESOLVED');
    expect(res.data.events.map((e: { toStatus: string }) => e.toStatus)).toEqual(['NEW', 'ACKNOWLEDGED', 'RESOLVED']);
    expect((await alertId.PATCH(req(`/api/alerts/${id}`, { method: 'PATCH', body: { status: 'ACKNOWLEDGED' } }), params({ id }))).status).toBe(409);
    // Hal qilingandan keyin 60 daqiqa davomida shu qoida qayta alert yaratmaydi
    await runInspection(orgId, now);
    expect(await prisma.alert.count({ where: { equipmentId: realEq, rule: 'NO_PRODUCTION_SIGNAL' } })).toBe(1);
  });

  it('AI tahlil: LLM yo‘q — qoidaga asoslangan natija saqlanadi va kunlik limit ishlaydi', async () => {
    const a = await prisma.alert.findFirstOrThrow({ where: { organizationId: orgId } });
    const r = await json(await analyzeRoute.POST(req('/api/ai/analyze', { body: { alertId: a.id } }), P));
    expect(r.data.provider).toBe('rule-based');
    expect(r.data.output.evidence.length).toBeGreaterThan(0);
    expect(await prisma.auditLog.count({ where: { organizationId: orgId, action: 'ai.analysis_created' } })).toBe(1);
    const pro = await prisma.plan.findUniqueOrThrow({ where: { key: 'PRO' } });
    await prisma.plan.update({ where: { key: 'PRO' }, data: { aiAnalysesPerDay: 1 } });
    try {
      const over = await analyzeRoute.POST(req('/api/ai/analyze', { body: { equipmentId: realEq } }), P);
      expect(over.status).toBe(402);
    } finally {
      await prisma.plan.update({ where: { key: 'PRO' }, data: { aiAnalysesPerDay: pro.aiAnalysesPerDay } });
    }
  });

  it('demo sinxronizatsiya: takroriy chaqiruv dublikat yaratmaydi', async () => {
    const first = await syncOrganizationTelemetry(orgId, now);
    expect(first.inserted).toBeGreaterThan(1000); // 31 kunlik backfill
    const count = await prisma.equipmentTelemetry.count({ where: { equipmentId: demoEq } });
    const again = await syncOrganizationTelemetry(orgId, now);
    expect(again.inserted).toBe(0);
    expect(await prisma.equipmentTelemetry.count({ where: { equipmentId: demoEq } })).toBe(count);
  });

  it('monitoring: kWh yig‘indisi bazadagi o‘lchovlarga teng, filtr va manba ko‘rsatiladi', async () => {
    const r = await json(await monitoring.GET(req(`/api/monitoring?preset=24h&granularity=hour&equipmentId=${realEq}`), P));
    expect(r.data.totals.energyKwh).toBeCloseTo(1.6, 6);
    expect(r.data.sources.realReadings).toBe(8);
    expect(r.data.sources.demoReadings).toBe(0);
    expect(r.data.equipment).toHaveLength(1);
    const all = await json(await monitoring.GET(req('/api/monitoring?preset=7d&granularity=day'), P));
    const dbSum = await prisma.equipmentTelemetry.aggregate({
      where: { organizationId: orgId, timestamp: { gte: new Date(all.data.range.from), lt: new Date(all.data.range.to) } },
      _sum: { energyKwh: true },
    });
    expect(all.data.totals.energyKwh).toBeCloseTo(dbSum._sum.energyKwh ?? 0, 4);
    expect(all.data.totals.cost).toBeCloseTo((dbSum._sum.energyKwh ?? 0) * 1000, 0);
  });

  it('CSV eksport ishlaydi', async () => {
    const r = await monitoringExport.GET(req(`/api/monitoring/export?preset=24h&granularity=hour&equipmentId=${realEq}&mode=raw`), P);
    expect(r.headers.get('content-type')).toContain('text/csv');
    const text = await r.text();
    expect(text.split('\r\n').filter(Boolean)).toHaveLength(9); // sarlavha + 8 qator
    expect(text).toContain('REAL');
  });

  it('Smart Control: READ-ONLY standart, simulyatsiyada ikki shaxs tasdig‘i, real uskunaga buyruq yo‘q', async () => {
    const body = { equipmentId: demoEq, action: 'STOP', reason: 'Signal yo‘q, tekshirildi', safetyConfirmed: true };
    expect((await control.POST(req('/api/control', { body }), P)).status).toBe(402); // READ_ONLY
    await prisma.organization.update({ where: { id: orgId }, data: { controlMode: 'SIMULATION' } });
    expect((await control.POST(req('/api/control', { body: { ...body, equipmentId: realEq } }), P)).status).toBe(402); // real uskuna
    expect((await control.POST(req('/api/control', { body: { ...body, safetyConfirmed: false } }), P)).status).toBe(422);
    const created = await json(await control.POST(req('/api/control', { body }), P));
    const id = created.data.id as string;
    expect((await controlId.POST(req(`/api/control/${id}`, { body: { decision: 'APPROVE' } }), params({ id }))).status).toBe(403); // o'zini tasdiqlay olmaydi
    const mgr = await json(await members.POST(req('/api/members', { body: { email: 'mgr@test.uz', name: 'Menejer Bir', role: 'MANAGER' } }), P));
    await loginAs('mgr@test.uz', mgr.data.temporaryPassword);
    const done = await json(await controlId.POST(req(`/api/control/${id}`, { body: { decision: 'APPROVE' } }), params({ id })));
    expect(done.data.status).toBe('EXECUTED_SIMULATED');
    expect(done.data.result).toMatch(/Real uskunaga buyruq yuborilmadi/);
    expect((await prisma.equipment.findUniqueOrThrow({ where: { id: demoEq } })).simulatedState).toBe('STOPPED');
    const actions = (await prisma.auditLog.findMany({ where: { organizationId: orgId, action: { startsWith: 'control.' } } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['control.requested', 'control.executed_simulated']));
  });
});
