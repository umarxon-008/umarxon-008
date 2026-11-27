import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cookieJar, hasDb, params, req } from '../helpers';

vi.mock('next/headers', async () => (await import('../helpers')).nextHeadersMock);

const P = params({});

describe.skipIf(!hasDb)('autentifikatsiya, izolyatsiya, rollar va limitlar (API)', async () => {
  const register = await import('@/app/api/auth/register/route');
  const login = await import('@/app/api/auth/login/route');
  const logout = await import('@/app/api/auth/logout/route');
  const profile = await import('@/app/api/auth/profile/route');
  const equipment = await import('@/app/api/equipment/route');
  const equipmentId = await import('@/app/api/equipment/[id]/route');
  const position = await import('@/app/api/equipment/[id]/position/route');
  const factories = await import('@/app/api/factories/route');
  const members = await import('@/app/api/members/route');
  const { resetRateLimits } = await import('@/server/rate-limit');
  const { prisma } = await import('@/server/db');

  const json = async (r: Response) => (await r.json()) as { ok: boolean; data: any; error?: { code: string; message: string } } // eslint-disable-line @typescript-eslint/no-explicit-any -- test javoblari;
  async function loginAs(email: string, password = 'Parol1234') {
    cookieJar.clear();
    const r = await login.POST(req('/api/auth/login', { body: { email, password } }), P);
    expect(r.status).toBe(200);
  }
  const base = { name: 'Tokarlik stanogi', code: 'TKR-01', nominalPowerKw: 15, dataSource: 'DEMO', hasProductionSignal: false };

  let factoryA = '';
  let eqB = '';

  beforeAll(async () => {
    resetRateLimits();
    for (const [name, email, org] of [
      ['Anvar Owner', 'a@test.uz', 'A Zavod'],
      ['Bekzod Owner', 'b@test.uz', 'B Zavod'],
    ]) {
      cookieJar.clear();
      const r = await register.POST(
        req('/api/auth/register', { body: { name, email, password: 'Parol1234', confirmPassword: 'Parol1234', organizationName: org, industry: 'Boshqa', acceptTerms: true } }),
        P,
      );
      expect(r.status).toBe(201);
    }
    await loginAs('b@test.uz');
    const fb = (await json(await factories.GET(req('/api/factories'), P))).data[0].id;
    const created = await json(await equipment.POST(req('/api/equipment', { body: { ...base, factoryId: fb } }), P));
    eqB = created.data.id;
    await loginAs('a@test.uz');
    factoryA = (await json(await factories.GET(req('/api/factories'), P))).data[0].id;
  });

  it('ro‘yxatdan o‘tish: tashkilot, owner a’zoligi, parol hash qilingan', async () => {
    const r = await json(await profile.GET(req('/api/auth/profile'), P));
    expect(r.data.organization.name).toBe('A Zavod');
    expect(r.data.role).toBe('OWNER');
    const u = await prisma.user.findUniqueOrThrow({ where: { email: 'a@test.uz' } });
    expect(u.passwordHash).not.toContain('Parol1234');
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('bir xil email bilan qayta ro‘yxatdan o‘tib bo‘lmaydi', async () => {
    const r = await register.POST(
      req('/api/auth/register', { body: { name: 'X Y', email: 'A@test.uz', password: 'Parol1234', confirmPassword: 'Parol1234', organizationName: 'X Zavod', industry: 'Boshqa', acceptTerms: true } }),
      P,
    );
    expect(r.status).toBe(409);
  });

  it('noto‘g‘ri parol — 401, chiqishdan keyin API yopiq', async () => {
    const bad = await login.POST(req('/api/auth/login', { body: { email: 'a@test.uz', password: 'NotRight1' } }), P);
    expect(bad.status).toBe(401);
    await logout.POST(req('/api/auth/logout', { method: 'POST' }), P);
    expect((await equipment.GET(req('/api/equipment'), P)).status).toBe(401);
    await loginAs('a@test.uz');
  });

  it('CSRF: boshqa Origin’dan kelgan o‘zgartiruvchi so‘rov rad etiladi', async () => {
    const r = await equipment.POST(req('/api/equipment', { body: { ...base, factoryId: factoryA }, origin: 'https://evil.example' }), P);
    expect(r.status).toBe(403);
  });

  it('tashkilotlar izolyatsiyasi: A tashkilot B uskunasini ko‘ra, o‘zgartira, o‘chira olmaydi', async () => {
    const list = await json(await equipment.GET(req('/api/equipment'), P));
    expect(list.data.items.find((e: { id: string }) => e.id === eqB)).toBeUndefined();
    expect((await equipmentId.GET(req(`/api/equipment/${eqB}`), params({ id: eqB }))).status).toBe(404);
    expect((await equipmentId.PATCH(req(`/api/equipment/${eqB}`, { method: 'PATCH', body: { ...base, factoryId: factoryA } }), params({ id: eqB }))).status).toBe(404);
    expect((await equipmentId.DELETE(req(`/api/equipment/${eqB}`, { method: 'DELETE' }), params({ id: eqB }))).status).toBe(404);
    expect((await position.PATCH(req(`/api/equipment/${eqB}/position`, { method: 'PATCH', body: { mapX: 1, mapY: 1 } }), params({ id: eqB }))).status).toBe(404);
    // B zavodiga A tashkilotidan uskuna biriktirib bo'lmaydi
    const fb = (await prisma.equipment.findUniqueOrThrow({ where: { id: eqB } })).factoryId;
    expect((await equipment.POST(req('/api/equipment', { body: { ...base, code: 'X-1', factoryId: fb } }), P)).status).toBe(422);
    expect(await prisma.equipment.count({ where: { id: eqB } })).toBe(1);
  });

  it('uskuna CRUD va xarita koordinatalari bazada saqlanadi', async () => {
    const c = await json(await equipment.POST(req('/api/equipment', { body: { ...base, factoryId: factoryA, mapX: 200, mapY: 150 } }), P));
    expect(c.ok).toBe(true);
    const id = c.data.id as string;
    const dup = await equipment.POST(req('/api/equipment', { body: { ...base, factoryId: factoryA } }), P);
    expect(dup.status).toBe(409);
    const u = await json(await equipmentId.PATCH(req(`/api/equipment/${id}`, { method: 'PATCH', body: { ...base, name: 'Yangi nom', factoryId: factoryA, baselinePowerKw: 9 } }), params({ id })));
    expect(u.data.name).toBe('Yangi nom');
    const moved = await json(await position.PATCH(req(`/api/equipment/${id}/position`, { method: 'PATCH', body: { mapX: 640.4, mapY: 9000 } }), params({ id })));
    expect(moved.data).toEqual({ mapX: 640.4, mapY: 600 }); // xarita balandligi 600 — chegaraga qisiladi
    const db = await prisma.equipment.findUniqueOrThrow({ where: { id } });
    expect([db.mapX, db.mapY, db.baselinePowerKw]).toEqual([640.4, 600, 9]);
    expect(await prisma.auditLog.count({ where: { entityId: id, action: 'map.equipment_moved' } })).toBe(1);
    expect((await equipmentId.DELETE(req(`/api/equipment/${id}`, { method: 'DELETE' }), params({ id }))).status).toBe(200);
    expect(await prisma.equipment.count({ where: { id } })).toBe(0);
  });

  it('rollar: Viewer uskuna qo‘sha olmaydi, Engineer qo‘sha oladi, lekin a’zo qo‘sha olmaydi', async () => {
    const add = async (email: string, role: string) => json(await members.POST(req('/api/members', { body: { email, name: 'Test User', role } }), P));
    const v = await add('viewer@test.uz', 'VIEWER');
    expect(v.data.temporaryPassword).toBeTruthy();
    const e = await add('eng@test.uz', 'ENGINEER');
    await loginAs('viewer@test.uz', v.data.temporaryPassword);
    expect((await json(await profile.GET(req('/api/auth/profile'), P))).data.user.mustChangePassword).toBe(true);
    expect((await equipment.POST(req('/api/equipment', { body: { ...base, code: 'V-1', factoryId: factoryA } }), P)).status).toBe(403);
    expect((await equipment.GET(req('/api/equipment'), P)).status).toBe(200);
    expect((await members.GET(req('/api/members'), P)).status).toBe(403);
    await loginAs('eng@test.uz', e.data.temporaryPassword);
    expect((await equipment.POST(req('/api/equipment', { body: { ...base, code: 'E-1', factoryId: factoryA } }), P)).status).toBe(201);
    expect((await members.POST(req('/api/members', { body: { email: 'z@test.uz', name: 'Zz Zz', role: 'OWNER' } }), P)).status).toBe(403);
    await loginAs('a@test.uz');
  });

  it('Free tarif limitlari backendda tekshiriladi (foydalanuvchi va uskuna)', async () => {
    // Free: 3 foydalanuvchi — owner + viewer + engineer = 3
    const over = await members.POST(req('/api/members', { body: { email: 'fourth@test.uz', name: 'Four Th', role: 'VIEWER' } }), P);
    expect(over.status).toBe(402);
    expect((await json(over)).error?.code).toBe('LIMIT_EXCEEDED');
    const current = await prisma.equipment.count({ where: { factoryId: factoryA } });
    for (let i = current; i < 15; i++) {
      const r = await equipment.POST(req('/api/equipment', { body: { ...base, code: `L-${i}`, factoryId: factoryA } }), P);
      expect(r.status).toBe(201);
    }
    const r = await equipment.POST(req('/api/equipment', { body: { ...base, code: 'L-OVER', factoryId: factoryA } }), P);
    expect(r.status).toBe(402);
    const second = await factories.POST(req('/api/factories', { body: { name: 'Ikkinchi zavod' } }), P);
    expect(second.status).toBe(402);
  });
});
