import { ArrowRight, Bot, LineChart, Map, ShieldCheck, Zap } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { EnergyRobot, FactoryScene } from '@/components/brand/illustrations';
import { PlanCards } from '@/components/public/plan-cards';
import { Reveal } from '@/components/public/reveal';
import { listPlans } from '@/server/services/plans';

export const dynamic = 'force-dynamic';

const CAPABILITIES = [
  { icon: Zap, label: 'Energiya monitoringi' },
  { icon: Map, label: '2D zavod xaritasi' },
  { icon: Bot, label: 'AI Inspector' },
  { icon: LineChart, label: 'Hisobotlar' },
  { icon: ShieldCheck, label: 'Xavfsiz boshqaruv' },
];

export default async function LandingPage() {
  const plans = await listPlans().catch(() => []);
  return (
    <>
      <section className="overflow-hidden bg-gradient-to-b from-surface to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-24 lg:grid-cols-2">
          <div>
            <h1 className="ec-fade-up text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">
              Energiya sarfini boshqaring. <span className="text-brand">Kelajakni</span> <span className="text-energy">tejang.</span>
            </h1>
            <p className="ec-fade-up ec-delay-1 mt-5 max-w-lg text-lg text-muted">
              Har bir uskuna qancha elektr sarflayotganini ko‘ring va isrofni vaqtida aniqlang.
            </p>
            <div className="ec-fade-up ec-delay-2 mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register" size="lg">
                Boshlash <ArrowRight className="h-4 w-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/login" size="lg" variant="outline">
                Kirish
              </LinkButton>
            </div>
            <ul className="ec-fade-up ec-delay-3 mt-10 flex flex-wrap gap-2" aria-label="Imkoniyatlar">
              {CAPABILITIES.map((c) => (
                <li key={c.label} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-navy shadow-card ring-1 ring-line/70">
                  <c.icon className="h-4 w-4 text-brand" aria-hidden />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="ec-fade-up ec-delay-2 relative">
            <div className="rounded-[2rem] bg-white p-6 shadow-card ring-1 ring-line/70">
              <FactoryScene className="h-auto w-full" />
            </div>
            {/* Robot sekin zavod o'rtasigacha yurib boradi va joyiga qaytadi (takrorlanadi) */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-8 h-40 sm:h-52">
              <div className="ec-walk absolute bottom-0">
                <div className="ec-walk-bob">
                  <EnergyRobot walking className="h-40 w-auto drop-shadow-sm sm:h-52" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6" aria-labelledby="pricing-title">
        <Reveal>
          <h2 id="pricing-title" className="text-center text-3xl font-bold tracking-tight text-navy">
            Tariflar
          </h2>
        </Reveal>
        <Reveal className="mt-8" delay={100}>
          {plans.length ? <PlanCards plans={plans} /> : <p className="text-center text-muted">Tariflarni yuklab bo‘lmadi.</p>}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-brand px-6 py-10 text-white sm:px-10 md:flex-row md:items-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Bugunoq boshlang</h2>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/register" variant="success" size="lg">
                Ro‘yxatdan o‘tish
              </LinkButton>
              <LinkButton href="/login" size="lg" variant="outline" className="border-white">
                Kirish
              </LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
