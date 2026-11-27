'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, FlaskConical, Layers, LogOut, Menu, Radio, Settings as SettingsIcon, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api-client';
import { can, ROLE_LABELS, type OrgRoleName } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { APP_NAV } from './nav';
import { GlobalSearch } from './global-search';
import { NotificationsPopover } from './notifications-popover';
import { PlanDialog } from './plan-dialog';

export interface ShellProps {
  user: { name: string; email: string; isPlatformAdmin: boolean; mustChangePassword: boolean };
  org: { id: string; name: string; isDemo: boolean };
  role: OrgRoleName;
  memberships: { organizationId: string; name: string; role: OrgRoleName }[];
  unread: number;
  dataMode: 'DEMO' | 'REAL' | 'MIXED' | 'EMPTY';
  planName: string;
  children: React.ReactNode;
}

function DataModeIndicator({ mode }: { mode: ShellProps['dataMode'] }) {
  if (mode === 'DEMO')
    return (
      <Badge tone="violet" icon={<FlaskConical className="h-3 w-3" aria-hidden />} title="Barcha uskunalar simulyatsiya qilingan demo ma'lumot bilan ishlamoqda">
        Demo ma’lumot
      </Badge>
    );
  if (mode === 'REAL')
    return (
      <Badge tone="green" icon={<Radio className="h-3 w-3" aria-hidden />} title="Barcha uskunalar real sensor manbasiga ulangan">
        Real ma’lumot
      </Badge>
    );
  if (mode === 'MIXED')
    return (
      <Badge tone="amber" icon={<Layers className="h-3 w-3" aria-hidden />} title="Ba'zi uskunalar demo, ba'zilari real manbadan">
        Demo + real
      </Badge>
    );
  return <Badge tone="gray">Ma’lumot yo‘q</Badge>;
}

export function AppShell({ user, org, role, memberships, unread, dataMode, planName, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Menyular qaysi sahifada ochilgan bo'lsa, faqat o'sha sahifada ochiq turadi (navigatsiyada avtomatik yopiladi)
  const [openMenu, setOpenMenu] = useState<{ kind: 'mobile' | 'profile' | 'org' | 'notif'; path: string } | null>(null);
  const isOpen = (kind: 'mobile' | 'profile' | 'org' | 'notif') => openMenu?.kind === kind && openMenu.path === pathname;
  const notifOpen = isOpen('notif');
  const [planOpen, setPlanOpen] = useState(false);
  const mobileOpen = isOpen('mobile');
  const menuOpen = isOpen('profile');
  const orgOpen = isOpen('org');
  const setMobileOpen = (v: boolean) => setOpenMenu(v ? { kind: 'mobile', path: pathname } : null);
  const toggle = (kind: 'profile' | 'org' | 'notif') => setOpenMenu((m) => (m?.kind === kind && m.path === pathname ? null : { kind, path: pathname }));

  useEffect(() => {
    if (user.mustChangePassword && pathname !== '/app/settings') router.replace('/app/settings?mustChange=1#security');
  }, [user.mustChangePassword, pathname, router]);

  // Ma'lumotni fon rejimida yangilab turish (demo generator va AI Inspector serverda ishga tushadi)
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [router]);

  const items = APP_NAV.filter((n) => (n.adminOnly ? user.isPlatformAdmin : !n.permission || can(role, n.permission)));

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  }

  async function switchOrg(id: string) {
    await api('/api/auth/switch-org', { body: { organizationId: id } });
    setOpenMenu(null);
    router.push('/app/dashboard');
    router.refresh();
  }

  const nav = (
    <nav aria-label="Ilova navigatsiyasi" className="flex flex-col gap-0.5 px-3">
      {items.map((n) => {
        const active = pathname === n.href || pathname.startsWith(n.href + '/');
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-brand text-white shadow-sm' : 'text-[#c5d2ea] hover:bg-white/10 hover:text-white',
            )}
          >
            <n.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  // Yon menyu pastidagi tarif kartasi — bosilganda tarifni yangilash oynasi ochiladi
  const planCard = (
    <button
      type="button"
      onClick={() => {
        setMobileOpen(false);
        setPlanOpen(true);
      }}
      className="group mx-3 mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 text-left text-xs text-[#b9c6dd] transition-colors hover:bg-white/10"
      aria-label={`Tarif: ${planName}. Tarifni yangilash`}
    >
      <span className="rounded-lg bg-energy/20 p-1.5 text-energy">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-white">{org.name}</span>
        <span className="mt-0.5 block">
          Tarif: {planName}
          {org.isDemo && ' · demo'}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy pb-4 lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href="/app/dashboard" aria-label="Dashboard">
            <Logo light />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto pt-2">{nav}</div>
        {planCard}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigatsiya menyusi">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy pb-4">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo light />
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Menyuni yopish">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {planCard}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-line/70 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <button type="button" className="rounded-lg p-2 text-navy hover:bg-brand-50 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menyuni ochish">
            <Menu className="h-5 w-5" />
          </button>
          {memberships.length > 1 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggle('org')}
                aria-expanded={orgOpen}
                aria-haspopup="listbox"
                className="flex max-w-[180px] items-center gap-1 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-navy hover:bg-surface sm:max-w-xs"
              >
                <span className="truncate">{org.name}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              </button>
              {orgOpen && (
                <ul role="listbox" aria-label="Tashkilotni tanlash" className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-line bg-white p-1 shadow-pop">
                  {memberships.map((m) => (
                    <li key={m.organizationId}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={m.organizationId === org.id}
                        onClick={() => switchOrg(m.organizationId)}
                        className={cn('flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-surface', m.organizationId === org.id && 'bg-brand-50')}
                      >
                        <span className="font-semibold text-navy">{m.name}</span>
                        <span className="text-xs text-muted">{ROLE_LABELS[m.role]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <span className="hidden max-w-xs truncate text-sm font-semibold text-navy sm:block">{org.name}</span>
          )}
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <div className="hidden sm:block">
            <DataModeIndicator mode={dataMode} />
          </div>
          <NotificationsPopover open={notifOpen} onToggle={() => toggle('notif')} onClose={() => setOpenMenu(null)} unread={unread} />
          <div className="relative">
            <button
              type="button"
              onClick={() => toggle('profile')}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-brand-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white" aria-hidden>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-semibold leading-tight text-navy">{user.name}</span>
                <span className="block text-xs leading-tight text-muted">{ROLE_LABELS[role]}</span>
              </span>
              <span className="sr-only">Profil menyusi</span>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-line bg-white p-1 shadow-pop">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-navy">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <div className="px-3 pb-2 sm:hidden">
                  <DataModeIndicator mode={dataMode} />
                </div>
                <Link role="menuitem" href="/app/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy hover:bg-surface">
                  <SettingsIcon className="h-4 w-4" aria-hidden /> Sozlamalar
                </Link>
                {user.isPlatformAdmin && (
                  <Link role="menuitem" href="/app/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy hover:bg-surface">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> Platforma admin
                  </Link>
                )}
                <button role="menuitem" type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-50">
                  <LogOut className="h-4 w-4" aria-hidden /> Chiqish
                </button>
              </div>
            )}
          </div>
        </div>
        {user.mustChangePassword && (
          <div className="bg-amber-50 px-4 py-2 text-center text-sm text-navy" role="alert">
            Xavfsizlik uchun vaqtinchalik parolni almashtiring.
          </div>
        )}
      </header>
      <PlanDialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        canView={can(role, 'billing.view')}
        canManage={can(role, 'billing.manage')}
        currentPlanName={planName}
      />
      <main id="main" className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
