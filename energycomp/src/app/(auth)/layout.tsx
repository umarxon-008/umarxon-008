import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { EnergyRobot } from '@/components/brand/illustrations';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <Link href="/" aria-label="Bosh sahifa">
          <Logo light />
        </Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Energiya sarfini boshqaring. Kelajakni tejang.</h2>
          <p className="mt-3 text-[#b9c6dd]">Har bir uskunaning sarfini kuzating, isrofni erta aniqlang va asosli qaror qabul qiling.</p>
        </div>
        <EnergyRobot className="absolute -right-6 bottom-8 h-64 w-auto opacity-95" />
        <p className="text-xs text-[#8fa0bf]">© EnergyComp MVP</p>
      </aside>
      <main id="main" className="flex items-center justify-center bg-surface px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="Bosh sahifa">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
