import Link from 'next/link';
import { EnergyRobot } from '@/components/brand/illustrations';

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <EnergyRobot className="h-40 w-auto" />
      <h1 className="mt-6 text-2xl font-bold text-navy">Sahifa topilmadi</h1>
      <p className="mt-2 text-muted">Siz qidirgan sahifa mavjud emas yoki ko‘chirilgan.</p>
      <Link href="/" className="mt-6 font-semibold text-brand hover:underline">
        Bosh sahifaga qaytish
      </Link>
    </main>
  );
}
