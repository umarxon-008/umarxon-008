import type { Metadata } from 'next';
import { Activity, Bot, Building2, FileBarChart, Map, ShieldCheck, ToggleLeft } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Imkoniyatlar' };

const MODULES = [
  {
    icon: Activity,
    title: 'Energy Monitoring',
    points: [
      'Korxona va uskuna bo‘yicha joriy quvvat (kW) va yig‘ilgan energiya (kWh)',
      'Soat / kun / hafta / oy kesimidagi grafiklar va jadval',
      'kWh tarifi asosida xarajat; tarif tarixi hisobga olinadi',
      'CSV eksport, sana va uskuna filtrlari',
      'Har bir o‘lchov manbasi — demo yoki real — aniq ko‘rsatiladi',
    ],
  },
  {
    icon: Map,
    title: 'Factory Map',
    badge: { text: '2D — Free, 3D — keyingi bosqichda (Pro)', tone: 'blue' as const },
    points: [
      'Zavod rejasi, zonalar va uskunalar 2D xaritada',
      'Uskunani sudrab ko‘chirish — joylashuv bazada saqlanadi',
      'Holat ranglar va belgilar bilan: ishlayapti, kutish, to‘xtagan, ogohlantirish, aloqa yo‘q',
      'Uskunani bosganda energiya ko‘rsatkichlari paneli',
    ],
  },
  {
    icon: Bot,
    title: 'AI Inspector',
    points: [
      '5 daqiqa energiya sarflanib, ishlab chiqarish signali kelmasa — ogohlantirish',
      'Baseline’dan yuqori quvvat, keskin o‘zgarish, uzoq kutish, aloqa uzilishi',
      'Har bir xulosada: aniqlangan faktlar, taxminlar va tavsiyalar alohida',
      'Dalillar (o‘lchovlar va vaqt oralig‘i) va ishonchlilik darajasi',
      'LLM ulanmagan bo‘lsa qoidaga asoslangan tahlil ishlaydi',
    ],
  },
  {
    icon: ToggleLeft,
    title: 'Smart Control',
    badge: { text: 'MVP: read-only / simulyatsiya', tone: 'amber' as const },
    points: [
      'Standart holatda faqat monitoring va tavsiya (READ-ONLY)',
      'AI uskunani hech qachon avtomatik o‘chirmaydi',
      'Simulyatsiya rejimida: so‘rov → ikkinchi shaxs tasdig‘i → faqat demo holat o‘zgaradi',
      'Har bir so‘rov, tasdiq va rad etish audit jurnaliga yoziladi',
      'Real boshqaruv adapteri hozircha mavjud emas — bu ochiq ko‘rsatiladi',
    ],
  },
  {
    icon: FileBarChart,
    title: 'Analytics',
    points: [
      'Davr bo‘yicha iste’mol va xarajat, oldingi davr bilan taqqoslash',
      'Uskunalar kesimi va eng ko‘p iste’mol qiluvchilar',
      'Ogohlantirishlar dinamikasi',
      'Tejash — faqat baseline davri belgilansa va “taxminiy” belgisi bilan',
    ],
  },
  {
    icon: Building2,
    title: 'Tashkilotlar va rollar',
    points: [
      'Har bir korxona — alohida tashkilot, ma’lumotlar to‘liq ajratilgan',
      'Rollar: Owner, Manager, Engineer, Viewer',
      'Ruxsatlar serverda tekshiriladi',
      'Bir foydalanuvchi bir nechta tashkilotga a’zo bo‘lishi mumkin',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-navy">Imkoniyatlar</h1>
        <p className="mt-4 text-lg text-muted">
          EnergyComp istalgan sanoat tarmog‘iga moslashadi: CNC, metallga ishlov berish, oziq-ovqat, to‘qimachilik, qadoqlash
          va boshqalar. Uskuna turlari va kategoriyalari sozlanadi.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <section key={m.title} className="rounded-card border border-line/70 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5 text-brand">
                <m.icon className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-navy">{m.title}</h2>
            </div>
            {m.badge && (
              <Badge tone={m.badge.tone} className="mt-3">
                {m.badge.text}
              </Badge>
            )}
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {m.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-energy" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-12 rounded-card border border-line/70 bg-surface p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-energy" aria-hidden />
          <h2 className="text-lg font-semibold text-navy">Integratsiyalar holati (ochiq)</h2>
        </div>
        <ul className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>✅ Demo Data Provider — ishlaydi</li>
          <li>✅ HTTP ingest API (gateway → EnergyComp) — ishlaydi, Pro</li>
          <li>⏳ MQTT adapter — rejalashtirilgan, hozircha yo‘q</li>
          <li>⏳ Modbus TCP gateway adapter — rejalashtirilgan, hozircha yo‘q</li>
          <li>⏳ To‘lov tizimi — ulanmagan (obunalar demo)</li>
          <li>⏳ Real uskuna boshqaruvi — mavjud emas</li>
        </ul>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href="/register" size="lg">Bepul boshlash</LinkButton>
        <LinkButton href="/pricing" size="lg" variant="outline">Tariflar</LinkButton>
      </div>
    </div>
  );
}
