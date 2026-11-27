import type { Metadata } from 'next';
import { EnergyRobot } from '@/components/brand/illustrations';
import { ContactForm } from '@/components/public/contact-form';

export const metadata: Metadata = { title: 'Biz haqimizda' };

const FAQ = [
  { q: 'Sensor bo‘lmasa ishlatsa bo‘ladimi?', a: 'Ha. Platformani demo ma’lumotlar bilan sinab ko‘rish mumkin — ular har doim “Demo” deb belgilanadi.' },
  { q: 'Real sensorni qanday ulayman?', a: 'Sozlamalar → Integratsiyalar bo‘limida token oling va gateway orqali o‘lchovlarni yuboring (Pro tarifi).' },
  { q: 'AI uskunani o‘zi o‘chira oladimi?', a: 'Yo‘q. AI faqat tavsiya beradi, qarorni odam qabul qiladi.' },
  { q: 'Ma’lumotlarim boshqalarga ko‘rinadimi?', a: 'Yo‘q. Har bir korxona ma’lumoti alohida saqlanadi.' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="ec-fade-up">
          <h1 className="text-4xl font-extrabold tracking-tight text-navy">Biz haqimizda</h1>
          <p className="mt-4 text-lg text-muted">
            EnergyComp korxonalarga elektr sarfini tushunarli ko‘rsatadi va isrofni kamaytirishga yordam beradi.
          </p>
        </div>
        <div className="ec-float mx-auto">
          <EnergyRobot className="h-48 w-auto" />
        </div>
      </div>

      <section id="yordam" className="mt-14 scroll-mt-24" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-bold text-navy">Savollar</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-line bg-white p-4 shadow-card">
              <summary className="cursor-pointer list-none font-semibold text-navy marker:hidden">
                <span className="mr-2 text-brand group-open:hidden">+</span>
                <span className="mr-2 hidden text-brand group-open:inline">−</span>
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-8 md:grid-cols-2" aria-labelledby="contact-title">
        <div>
          <h2 id="contact-title" className="text-2xl font-bold text-navy">Bog‘lanish</h2>
          <p className="mt-2 text-sm text-muted">Savol yoki taklifingizni yozib qoldiring.</p>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
