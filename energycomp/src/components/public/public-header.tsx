'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Globe } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { LinkButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Bosh sahifa' },
  { href: '/pricing', label: 'Tariflar' },
  { href: '/about', label: 'Biz haqimizda' },
  { href: '/about#yordam', label: 'Yordam' },
];

export function PublicHeader({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="EnergyComp bosh sahifa">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Asosiy navigatsiya">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-50 hover:text-brand',
                pathname === n.href ? 'text-brand' : 'text-navy',
              )}
              aria-current={pathname === n.href ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted"
            title="Interfeys tili: o‘zbek (lotin). Boshqa tillar keyingi bosqichda."
          >
            <Globe className="h-4 w-4" aria-hidden /> UZ
          </span>
          {loggedIn ? (
            <LinkButton href="/app/dashboard">Dashboardga o‘tish</LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost">
                Kirish
              </LinkButton>
              <LinkButton href="/register">Ro‘yxatdan o‘tish</LinkButton>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-navy hover:bg-brand-50 lg:hidden"
          aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-line bg-white px-4 pb-4 lg:hidden">
          <nav className="flex flex-col py-2" aria-label="Mobil navigatsiya">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-brand-50">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2">
            {loggedIn ? (
              <LinkButton href="/app/dashboard" className="flex-1">
                Dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="outline" className="flex-1">
                  Kirish
                </LinkButton>
                <LinkButton href="/register" className="flex-1">
                  Ro‘yxatdan o‘tish
                </LinkButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
