import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export function PublicFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-sm text-sm text-[#b9c6dd]">Energiya sarfini boshqaring. Kelajakni tejang.</p>
        </div>
        <nav aria-label="Footer navigatsiya">
          <p className="text-sm font-semibold">Sahifalar</p>
          <ul className="mt-3 space-y-2 text-sm text-[#b9c6dd]">
            <li><Link href="/pricing" className="hover:text-white">Tariflar</Link></li>
            <li><Link href="/about" className="hover:text-white">Biz haqimizda</Link></li>
            <li><Link href="/login" className="hover:text-white">Kirish</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">Aloqa</p>
          <ul className="mt-3 space-y-2 text-sm text-[#b9c6dd]">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden /> info@energycomp.uz <span className="text-xs">(namuna)</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-[#8fa0bf] sm:px-6">
          © {new Date().getFullYear()} EnergyComp
        </p>
      </div>
    </footer>
  );
}
