import type { Metadata } from 'next';
import { HelpCircle, Mail, Target } from 'lucide-react';
import { EnergyRobot } from '@/components/brand/illustrations';
import { ContactForm } from '@/components/public/contact-form';

export const metadata: Metadata = { title: 'Biz haqimizda' };

const FAQ = [
  { q: 'Sensor bo‘lmasa platformadan foydalansa bo‘ladimi?', a: 'Ha. Demo Data Provider simulyatsiya qilingan o‘lchovlar yaratadi. Bunday ma’lumotlar har doim “Demo ma’lumot” deb belgilanadi va real natija sifatida ko‘rsatilmaydi.' },
  { q: 'Real sensorlarni qanday ulash mumkin?', a: 'Hozircha HTTP ingest API orqali: gateway o‘lchovlarni POST /api/ingest ga yuboradi (Pro tarifi). MQTT va Modbus adapterlari rejalashtirilgan.' },
  { q: 'AI uskunani o‘zi o‘chira oladimi?', a: 'Yo‘q. AI faqat tahlil va tavsiya beradi. Boshqaruv MVPda faqat simulyatsiya rejimida, inson tasdig‘i bilan va audit jurnaliga yozilgan holda ishlaydi.' },
  { q: 'Ma’lumotlarim boshqa korxonalarga ko‘rinadimi?', a: 'Yo‘q. Har bir tashkilot ma’lumotlari alohida; har bir so‘rovda a’zolik va rol serverda tekshiriladi.' },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-navy">Biz haqimizda</h1>
          <p className="mt-4 text-lg text-muted">
            EnergyComp — sanoat korxonalari uchun energiya boshqaruvi platformasi. Missiyamiz: korxonalarga energiya sarfini
            tushunarli ko‘rsatish, ortiqcha sarfni erta aniqlash va ishlab chiqarish samaradorligini oshirishda yordam berish.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-card bg-surface p-5">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
            <p className="text-sm text-muted">
              Platforma MVP bosqichida. Real sensor integratsiyalari, 3D xarita va to‘lov tizimi keyingi bosqichlarda qo‘shiladi.
            </p>
          </div>
        </div>
        <EnergyRobot className="mx-auto h-56 w-auto" />
      </div>

      <section id="yordam" className="mt-16 scroll-mt-24" aria-labelledby="faq-title">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-brand" aria-hidden />
          <h2 id="faq-title" className="text-2xl font-bold text-navy">Yordam va ko‘p so‘raladigan savollar</h2>
        </div>
        <div className="mt-6 space-y-3">
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

      <section className="mt-16 grid gap-8 md:grid-cols-2" aria-labelledby="contact-title">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-brand" aria-hidden />
            <h2 id="contact-title" className="text-2xl font-bold text-navy">Biz bilan bog‘laning</h2>
          </div>
          <p className="mt-3 text-sm text-muted">
            Pilot loyiha, integratsiya yoki hamkorlik bo‘yicha xabar qoldiring. Xabarlar platforma administratoriga audit
            jurnali orqali yetkaziladi (email xizmati hali ulanmagan).
          </p>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
