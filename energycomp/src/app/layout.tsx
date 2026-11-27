import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: { default: 'EnergyComp — sanoat energiya boshqaruvi', template: '%s · EnergyComp' },
  description:
    'EnergyComp — ishlab chiqarish korxonalari uchun elektr energiyasi sarfini kuzatish, tahlil qilish va isrofni kamaytirish platformasi.',
  icons: { icon: '/assets/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#102B5C', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-screen">
        <a href="#main" className="skip-link">
          Asosiy kontentga o‘tish
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
