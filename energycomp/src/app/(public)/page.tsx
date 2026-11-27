import Link from 'next/link';
import { Activity, ArrowRight, Bot, Cpu, Gauge, Leaf, Map, PlugZap, ShieldCheck, LineChart } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { EnergyRobot, FactoryScene } from '@/components/brand/illustrations';
import { PlanCards } from '@/components/public/plan-cards';
import { listPlans } from '@/server/services/plans';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { icon: Activity, title: 'Energy Monitoring', text: 'Korxona va har bir uskuna bo‘yicha joriy quvvat (kW), yig‘ilgan energiya (kWh) va xarajat.', tone: 'bg-brand-50 text-brand' },
  { icon: Map, title: '2D / 3D xarita', text: 'Uskunalarni zavod rejasiga joylashtiring, holatini rangi va belgisi bilan ko‘ring. 3D — keyingi bosqichda.', tone: 'bg-energy-50 text-energy-600' },
  { icon: Bot, title: 'AI Inspector', text: 'Me’yordan yuqori sarf, bekor ishlash va aloqa uzilishini aniqlaydi, dalillar bilan tushuntiradi.', tone: 'bg-[#f2effd] text-[#5b3fc4]' },
  { icon: Leaf, title: 'Tejamkorlik', text: 'Eng ko‘p sarflayotgan uskunalar, davrlar taqqoslanishi va baseline asosida taxminiy tejash.', tone: 'bg-amber-50 text-[#9a6b00]' },
  { icon: ShieldCheck, title: 'Xavfsizlik', text: 'Rollar, tashkilotlar izolyatsiyasi, audit jurnali. AI uskunani hech qachon o‘zi o‘chirmaydi.', tone: 'bg-orange-50 text-orange' },
];

const STEPS = [
  { icon: PlugZap, title: 'Ulang', text: 'Uskunalarni qo‘shing va sensor yoki gateway’ni ulang. Sensor bo‘lmasa — demo ma’lumot bilan boshlang.' },
  { icon: Map, title: 'Joylashtiring', text: 'Zavod xaritasida uskunalarni sudrab joylashtiring va nominal quvvatini kiriting.' },
  { icon: LineChart, title: 'Kuzating', text: 'Dashboard va grafiklarda real vaqt sarfi, xarajat va holatlarni kuzating.' },
  { icon: Cpu, title: 'Tejang', text: 'AI Inspector tavsiyalarini ko‘rib chiqing va isrofni kamaytirish bo‘yicha qaror qabul qiling.' },
];

export default async function LandingPage() {
  const plans = await listPlans().catch(() => []);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-energy-50 px-3 py-1 text-xs font-semibold text-energy-600">
              <Gauge className="h-4 w-4" aria-hidden /> Sanoat energiya boshqaruvi platformasi
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">
              Energiya sarfini boshqaring. <span className="text-brand">Kelajakni</span> <span className="text-energy">tejang.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              EnergyComp ishlab chiqarish korxonalariga har bir uskunaning elektr sarfini kuzatish, isrofni erta aniqlash
              va asosli qaror qabul qilishda yordam beradi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">
                Boshqarishni boshlash <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/features" size="lg" variant="outline">
                Batafsil
              </LinkButton>
            </div>
            <p className="mt-4 text-sm text-muted">
              Sensor hali yo‘qmi? Platformani demo ma’lumotlar bilan sinab ko‘ring — demo ma’lumotlar har doim alohida belgilanadi.
            </p>
          </div>
          <div className="relative">
            <div className="rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-line/70">
              <FactoryScene className="h-auto w-full" />
            </div>
            <EnergyRobot className="absolute -bottom-6 -left-4 h-44 w-auto drop-shadow-sm sm:h-56 lg:-left-12" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="features-title">
        <div className="max-w-2xl">
          <h2 id="features-title" className="text-3xl font-bold tracking-tight text-navy">Asosiy imkoniyatlar</h2>
          <p className="mt-3 text-muted">Energiya sarfini tushunarli ko‘rsatish va isrofni kamaytirish uchun kerakli vositalar bitta platformada.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-card border border-line/70 bg-white p-5 shadow-card">
              <div className={`inline-flex rounded-xl p-2.5 ${f.tone}`}>
                <f.icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-navy">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-16" aria-labelledby="how-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="how-title" className="text-3xl font-bold tracking-tight text-navy">Qanday ishlaydi?</h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-card bg-white p-6 shadow-card">
                <span className="absolute right-5 top-5 text-4xl font-extrabold text-brand-100" aria-hidden>
                  {i + 1}
                </span>
                <div className="inline-flex rounded-xl bg-brand p-2.5 text-white">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-navy">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6" aria-labelledby="pricing-title">
        <div className="text-center">
          <h2 id="pricing-title" className="text-3xl font-bold tracking-tight text-navy">Tariflar</h2>
          <p className="mt-3 text-muted">Free tarifda boshlang. Narxlar hali belgilanmagan — MVP davrida obunalar demo rejimda.</p>
        </div>
        <div className="mt-10">
          {plans.length ? <PlanCards plans={plans} /> : <p className="text-center text-muted">Tariflar ma’lumotini yuklab bo‘lmadi.</p>}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/pricing" className="font-semibold text-brand hover:underline">
            Tariflarni batafsil solishtirish →
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-brand px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Korxonangiz energiya sarfini bugundan kuzating</h2>
            <p className="mt-2 text-[#d6e6fd]">Ro‘yxatdan o‘ting, uskunalaringizni qo‘shing va birinchi tahlilni oling.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/register" variant="success" size="lg">Ro‘yxatdan o‘tish</LinkButton>
            <LinkButton href="/login" size="lg" variant="outline" className="border-white">Kirish</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
