// Demo ma'lumotlar. Takroriy ishga tushirilganda dublikat yaratmaydi (upsert + skipDuplicates).
// Ishga tushirish: npm run db:seed
// DIQQAT: barcha raqamlar simulyatsiya — haqiqiy mijoz natijasi emas.
import 'dotenv/config';
import { prisma } from '../src/server/db';
import { hashPassword } from '../src/server/auth/password';
import { createOrganizationWithOwner } from '../src/server/services/organization';
import { ensureDefaultPlans } from '../src/server/services/plans';
import { syncOrganizationTelemetry } from '../src/server/services/telemetry-sync';
import { runInspection } from '../src/server/services/inspector';
import type { DemoProfile } from '../src/server/providers/sensor/demo';

export const DEMO_PASSWORD = 'Demo12345';

const USERS = [
  { email: 'admin@energycomp.uz', name: 'Aziz Karimov', isPlatformAdmin: true },
  { email: 'manager@energycomp.uz', name: 'Dilnoza Rahimova', isPlatformAdmin: false },
  { email: 'engineer@energycomp.uz', name: 'Bobur Toshmatov', isPlatformAdmin: false },
  { email: 'viewer@energycomp.uz', name: 'Malika Yusupova', isPlatformAdmin: false },
  { email: 'other@example.uz', name: 'Sardor Aliyev', isPlatformAdmin: false },
];

interface EqSeed {
  code: string;
  name: string;
  category: string;
  factory: 0 | 1;
  nominal: number;
  baseline?: number;
  profile: DemoProfile;
  signal?: boolean;
  x: number;
  y: number;
  location: string;
  manufacturer?: string;
  model?: string;
  real?: boolean;
  sensorId?: string;
}

const EQUIPMENT: EqSeed[] = [
  { code: 'CNC-01', name: 'CNC frezer stanogi #1', category: 'CNC stanok', factory: 0, nominal: 22, baseline: 15, profile: 'shift', signal: true, x: 120, y: 120, location: 'Sex A, 1-qator', manufacturer: 'Biesse', model: 'Rover A' },
  { code: 'CNC-02', name: 'CNC frezer stanogi #2', category: 'CNC stanok', factory: 0, nominal: 18, baseline: 12, profile: 'shift', signal: true, x: 260, y: 120, location: 'Sex A, 1-qator', manufacturer: 'Homag', model: 'Centateq' },
  { code: 'CNC-03', name: 'CNC frezer stanogi #3', category: 'CNC stanok', factory: 0, nominal: 25, baseline: 16, profile: 'idle_no_signal', signal: true, x: 400, y: 120, location: 'Sex A, 2-qator' },
  { code: 'CNC-04', name: 'Kromkalash stanogi', category: 'CNC stanok', factory: 0, nominal: 9, baseline: 6, profile: 'offline', signal: true, x: 520, y: 220, location: 'Sex A, 2-qator' },
  { code: 'LZR-01', name: 'Lazer kesish stanogi', category: 'CNC stanok', factory: 0, nominal: 30, baseline: 20, profile: 'long_standby', signal: true, x: 120, y: 300, location: 'Sex A, 3-qator' },
  { code: 'KNV-01', name: 'Konveyer liniyasi', category: 'Konveyer', factory: 0, nominal: 7.5, baseline: 5, profile: 'shift', signal: true, x: 300, y: 430, location: 'Sex A, yig‘uv' },
  { code: 'PCH-01', name: 'Quritish pechi', category: 'Pech / issiqlik uskunasi', factory: 0, nominal: 120, baseline: 60, profile: 'above_baseline', x: 460, y: 430, location: 'Sex A, quritish' },
  { code: 'KMP-01', name: 'Vintli kompressor', category: 'Kompressor', factory: 0, nominal: 45, profile: 'continuous', x: 720, y: 120, location: 'Kompressor xonasi', manufacturer: 'Atlas Copco', model: 'GA 45' },
  { code: 'NAS-01', name: 'Suv nasosi', category: 'Nasos', factory: 0, nominal: 15, profile: 'surge', x: 860, y: 200, location: 'Kompressor xonasi' },
  { code: 'VNT-01', name: 'Chang so‘rish ventilyatsiyasi', category: 'Ventilyatsiya', factory: 0, nominal: 11, profile: 'daylight', x: 760, y: 420, location: 'Ombor yonida' },
  { code: 'YRT-01', name: 'Sex yoritish tizimi', category: 'Yoritish', factory: 0, nominal: 6, profile: 'daylight', x: 880, y: 480, location: 'Butun sex' },
  { code: 'PRS-01', name: 'Gidravlik press', category: 'Boshqa', factory: 1, nominal: 37, baseline: 24, profile: 'shift', signal: true, x: 200, y: 200, location: 'Metall sexi' },
  { code: 'SVR-01', name: 'Payvandlash posti', category: 'Boshqa', factory: 1, nominal: 12, profile: 'shift', x: 420, y: 240, location: 'Metall sexi', real: true, sensorId: 'GW-01-SVR' },
];

async function upsertUser(u: (typeof USERS)[number], passwordHash: string) {
  return prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, isPlatformAdmin: u.isPlatformAdmin, passwordHash, mustChangePassword: false },
    create: { email: u.email, name: u.name, isPlatformAdmin: u.isPlatformAdmin, passwordHash },
  });
}

async function ensureOrg(name: string, ownerId: string, industry: string) {
  const existing = await prisma.organization.findFirst({ where: { name, members: { some: { userId: ownerId, role: 'OWNER' } } } });
  if (existing) return existing;
  const { org } = await prisma.$transaction((tx) => createOrganizationWithOwner(tx, { name, industry, ownerId, isDemo: true }));
  return org;
}

async function main() {
  const now = new Date();
  console.log('EnergyComp seed boshlandi...');
  await ensureDefaultPlans();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = Object.fromEntries(await Promise.all(USERS.map(async (u) => [u.email, await upsertUser(u, passwordHash)] as const)));
  const admin = users['admin@energycomp.uz']!;

  // --- Asosiy demo tashkilot ---
  const org = await ensureOrg('EnergyComp Demo Zavodi', admin.id, "Yog'ochga ishlov berish / CNC");
  await prisma.organization.update({ where: { id: org.id }, data: { isDemo: true, controlMode: 'SIMULATION', timezone: 'Asia/Tashkent', currency: 'UZS' } });
  const pro = await prisma.plan.findUniqueOrThrow({ where: { key: 'PRO' } });
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: { planId: pro.id, status: 'DEMO', isDemo: true },
    create: { organizationId: org.id, planId: pro.id, status: 'DEMO', isDemo: true },
  });

  for (const [email, role] of [
    ['manager@energycomp.uz', 'MANAGER'],
    ['engineer@energycomp.uz', 'ENGINEER'],
    ['viewer@energycomp.uz', 'VIEWER'],
  ] as const) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: users[email]!.id } },
      update: { role },
      create: { organizationId: org.id, userId: users[email]!.id, role },
    });
  }

  // Tarif tarixi: 1000 so'm/kWh (asosiy), 10 kun oldindan 1100 so'm/kWh
  const newTariffFrom = new Date(now.getTime() - 10 * 86_400_000);
  newTariffFrom.setUTCHours(19, 0, 0, 0); // Toshkent bo'yicha yarim tun
  const hasNewTariff = await prisma.energyTariff.findFirst({ where: { organizationId: org.id, name: 'Yangilangan tarif (demo)' } });
  if (!hasNewTariff) {
    await prisma.energyTariff.create({
      data: { organizationId: org.id, name: 'Yangilangan tarif (demo)', pricePerKwh: 1100, currency: 'UZS', validFrom: newTariffFrom },
    });
  }

  // Zavodlar
  const f1 = await prisma.factory.findFirstOrThrow({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' } });
  await prisma.factory.update({ where: { id: f1.id }, data: { name: 'Mebel fabrikasi (Sergeli)', address: 'Toshkent sh., Sergeli tumani (demo manzil)' } });
  await prisma.mapLayout.update({
    where: { factoryId: f1.id },
    data: {
      width: 1000,
      height: 600,
      zones: [
        { id: 'z1', name: 'Sex A — kesish va frezerlash', x: 40, y: 40, width: 580, height: 330, color: 'blue' },
        { id: 'z2', name: 'Yig‘uv va quritish', x: 40, y: 390, width: 580, height: 170, color: 'amber' },
        { id: 'z3', name: 'Kompressor xonasi', x: 650, y: 40, width: 310, height: 290, color: 'green' },
        { id: 'z4', name: 'Ombor', x: 650, y: 350, width: 310, height: 210, color: 'slate' },
      ],
    },
  });
  let f2 = await prisma.factory.findFirst({ where: { organizationId: org.id, name: 'Metall sexi (Chilonzor)' } });
  if (!f2) {
    f2 = await prisma.factory.create({ data: { organizationId: org.id, name: 'Metall sexi (Chilonzor)', address: 'Toshkent sh., Chilonzor (demo manzil)' } });
    await prisma.mapLayout.create({
      data: {
        organizationId: org.id,
        factoryId: f2.id,
        width: 800,
        height: 500,
        zones: [
          { id: 'm1', name: 'Press bo‘limi', x: 40, y: 40, width: 340, height: 420, color: 'violet' },
          { id: 'm2', name: 'Payvandlash', x: 400, y: 40, width: 360, height: 420, color: 'amber' },
        ],
      },
    });
  }
  const factories = [f1, f2];
  const categories = await prisma.equipmentCategory.findMany({ where: { organizationId: org.id } });
  const catId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;

  for (const e of EQUIPMENT) {
    const demoConfig =
      e.profile === 'offline'
        ? { profile: e.profile, offlineSince: new Date(now.getTime() - 47 * 60_000).toISOString() }
        : { profile: e.profile };
    const data = {
      name: e.name,
      factoryId: factories[e.factory]!.id,
      categoryId: catId(e.category),
      nominalPowerKw: e.nominal,
      baselinePowerKw: e.baseline ?? null,
      hasProductionSignal: e.signal ?? false,
      mapX: e.x,
      mapY: e.y,
      location: e.location,
      manufacturer: e.manufacturer ?? null,
      model: e.model ?? null,
      dataSource: e.real ? ('REAL' as const) : ('DEMO' as const),
      sensorId: e.sensorId ?? `DEMO-${e.code}`,
      demoConfig: e.real ? undefined : demoConfig,
      simulatedState: null,
      simulatedStateAt: null,
    };
    await prisma.equipment.upsert({
      where: { organizationId_code: { organizationId: org.id, code: e.code } },
      update: data,
      create: { ...data, organizationId: org.id, code: e.code },
    });
  }

  // Tarixiy (hal qilingan) ogohlantirishlar — analytics dinamikasi uchun. Demo deb belgilangan.
  const eqs = await prisma.equipment.findMany({ where: { organizationId: org.id } });
  const byCode = Object.fromEntries(eqs.map((e) => [e.code, e]));
  const history: { code: string; rule: 'ABOVE_BASELINE' | 'NO_DATA' | 'SUDDEN_CHANGE' | 'LONG_STANDBY' | 'NO_PRODUCTION_SIGNAL'; severity: 'INFO' | 'WARNING' | 'CRITICAL'; daysAgo: number; title: string }[] = [
    { code: 'PCH-01', rule: 'ABOVE_BASELINE', severity: 'WARNING', daysAgo: 26, title: 'Quritish pechi: quvvat odatiydan 24% yuqori' },
    { code: 'KMP-01', rule: 'SUDDEN_CHANGE', severity: 'WARNING', daysAgo: 22, title: 'Vintli kompressor: sarf keskin oshdi (1,9×)' },
    { code: 'CNC-02', rule: 'NO_PRODUCTION_SIGNAL', severity: 'WARNING', daysAgo: 18, title: 'CNC frezer stanogi #2: energiya sarflanmoqda, ishlab chiqarish signali kelmadi' },
    { code: 'NAS-01', rule: 'SUDDEN_CHANGE', severity: 'WARNING', daysAgo: 15, title: 'Suv nasosi: sarf keskin oshdi (2,1×)' },
    { code: 'CNC-04', rule: 'NO_DATA', severity: 'CRITICAL', daysAgo: 12, title: "Kromkalash stanogi: uskunadan ma'lumot kelmayapti" },
    { code: 'LZR-01', rule: 'LONG_STANDBY', severity: 'INFO', daysAgo: 9, title: 'Lazer kesish stanogi: 60 daqiqadan ortiq kutish rejimida' },
    { code: 'PCH-01', rule: 'ABOVE_BASELINE', severity: 'CRITICAL', daysAgo: 6, title: 'Quritish pechi: quvvat odatiydan 52% yuqori' },
    { code: 'KNV-01', rule: 'NO_PRODUCTION_SIGNAL', severity: 'WARNING', daysAgo: 4, title: 'Konveyer liniyasi: energiya sarflanmoqda, ishlab chiqarish signali kelmadi' },
    { code: 'VNT-01', rule: 'LONG_STANDBY', severity: 'INFO', daysAgo: 2, title: 'Ventilyatsiya: 60 daqiqadan ortiq kutish rejimida' },
  ];
  for (const [i, h] of history.entries()) {
    const eq = byCode[h.code];
    if (!eq) continue;
    const at = new Date(now.getTime() - h.daysAgo * 86_400_000);
    const id = `seed-hist-${org.id.slice(-6)}-${i}`;
    await prisma.alert.upsert({
      where: { id },
      update: {},
      create: {
        id,
        organizationId: org.id,
        equipmentId: eq.id,
        rule: h.rule,
        title: h.title,
        severity: h.severity,
        status: 'RESOLVED',
        explanation: 'Tarixiy demo ogohlantirish (simulyatsiya).',
        recommendation: 'Demo yozuv — tarixni namoyish qilish uchun.',
        evidence: { items: [{ label: 'Manba', value: "Demo ma'lumot" }], facts: [], assumptions: [] },
        confidence: 'MEDIUM',
        conditionActive: false,
        source: 'DEMO',
        windowStart: new Date(at.getTime() - 30 * 60_000),
        windowEnd: at,
        detectedAt: at,
        lastCheckedAt: at,
        reviewedById: users['engineer@energycomp.uz']!.id,
        reviewedAt: new Date(at.getTime() + 45 * 60_000),
        events: {
          create: [
            { organizationId: org.id, toStatus: 'NEW', note: 'Qoidaga asoslangan aniqlash', createdAt: at },
            { organizationId: org.id, actorId: users['engineer@energycomp.uz']!.id, fromStatus: 'NEW', toStatus: 'RESOLVED', note: 'Tekshirildi (demo)', createdAt: new Date(at.getTime() + 45 * 60_000) },
          ],
        },
      },
    });
  }

  // Baseline davri (taxminiy tejashni namoyish qilish uchun): 30–23 kun oldin
  await prisma.organization.update({
    where: { id: org.id },
    data: { baselineStart: new Date(now.getTime() - 30 * 86_400_000), baselineEnd: new Date(now.getTime() - 23 * 86_400_000) },
  });

  // --- Ikkinchi tashkilot (izolyatsiyani tekshirish uchun) ---
  const other = await ensureOrg('Boshqa Korxona MChJ', users['other@example.uz']!.id, 'Oziq-ovqat');
  const of1 = await prisma.factory.findFirstOrThrow({ where: { organizationId: other.id } });
  const otherCats = await prisma.equipmentCategory.findMany({ where: { organizationId: other.id } });
  for (const e of [
    { code: 'MIX-01', name: 'Xamir qorish mashinasi', nominal: 15, baseline: 10, x: 150, y: 150 },
    { code: 'SOV-01', name: 'Sovutish kamerasi', nominal: 20, baseline: 15, x: 400, y: 200 },
  ]) {
    await prisma.equipment.upsert({
      where: { organizationId_code: { organizationId: other.id, code: e.code } },
      update: { baselinePowerKw: e.baseline },
      create: {
        organizationId: other.id,
        factoryId: of1.id,
        categoryId: otherCats.find((c) => c.name === 'Boshqa')?.id ?? null,
        code: e.code,
        name: e.name,
        nominalPowerKw: e.nominal,
        baselinePowerKw: e.baseline,
        mapX: e.x,
        mapY: e.y,
        dataSource: 'DEMO',
        demoConfig: { profile: e.code === 'SOV-01' ? 'continuous' : 'shift' },
      },
    });
  }

  console.log('Telemetriya yaratilmoqda (30 kun, demo)...');
  for (const o of [org, other]) {
    const r = await syncOrganizationTelemetry(o.id, now);
    console.log(`  ${o.name}: ${r.inserted} ta yangi o'lchov`);
    const i = await runInspection(o.id, now);
    console.log(`  AI Inspector: ${i.created} ta yangi, ${i.updated} ta yangilangan ogohlantirish`);
  }

  console.log('\nTayyor. Demo kirish ma’lumotlari (faqat development):');
  for (const u of USERS) console.log(`  ${u.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
