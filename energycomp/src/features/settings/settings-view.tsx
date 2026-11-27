'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDashed, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { PasswordInput } from '@/features/auth/password-input';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { useApiData } from '@/lib/use-api';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/format';
import { ROLE_LABELS, type OrgRoleName } from '@/lib/permissions';

function ProfileSection({ user, role, orgName }: { user: { name: string; email: string }; role: OrgRoleName; orgName: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader title="Profil" />
      <CardBody>
        <form
          className="grid max-w-xl gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('/api/auth/profile', { method: 'PATCH', body: { name } });
              push('success', 'Profil saqlandi');
              router.refresh();
            } catch (err) {
              push('error', errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Ism-familiya" required>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Email" hint="Email o‘zgartirish keyingi bosqichda (tasdiqlash xati kerak)">{(p) => <Input {...p} value={user.email} disabled />}</Field>
          <p className="text-sm text-muted">Faol tashkilot: <strong className="text-navy">{orgName}</strong> · rol: <strong className="text-navy">{ROLE_LABELS[role]}</strong></p>
          <div><Button type="submit" loading={busy}>Saqlash</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}

function SecuritySection({ timezone, mustChange }: { timezone: string; mustChange: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [v, setV] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: sessions, reload: loadSessions } = useApiData<{ id: string; createdAt: string; lastSeenAt: string; userAgent: string | null; ip: string | null; current: boolean }[]>('/api/auth/sessions');
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Parolni almashtirish" description="Almashtirgandan so‘ng boshqa qurilmalardagi sessiyalar yopiladi." />
        <CardBody>
          {mustChange && <Notice tone="warning" className="mb-4">Siz vaqtinchalik parol bilan kirdingiz. Davom etish uchun yangi parol o‘rnating.</Notice>}
          <form
            className="grid max-w-xl gap-4"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setErrs({});
              setError(null);
              try {
                await api('/api/auth/change-password', { body: v });
                push('success', 'Parol yangilandi');
                setV({ currentPassword: '', password: '', confirmPassword: '' });
                void loadSessions();
                if (mustChange) router.push('/app/dashboard');
                router.refresh();
              } catch (err) {
                setError(errorMessage(err));
                if (err instanceof ApiClientError) setErrs(err.fieldErrors());
              } finally {
                setBusy(false);
              }
            }}
          >
            <FormError message={error} />
            <Field label="Joriy parol" required error={errs.currentPassword}>{(p) => <PasswordInput {...p} autoComplete="current-password" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} />}</Field>
            <Field label="Yangi parol" required error={errs.password} hint="Kamida 8 belgi, harf va raqam">{(p) => <PasswordInput {...p} autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>
            <Field label="Yangi parolni tasdiqlash" required error={errs.confirmPassword}>{(p) => <PasswordInput {...p} autoComplete="new-password" value={v.confirmPassword} onChange={(e) => setV({ ...v, confirmPassword: e.target.value })} />}</Field>
            <div><Button type="submit" loading={busy}>Parolni yangilash</Button></div>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Faol sessiyalar"
          description="Sessiya httpOnly cookie’da saqlanadi; “Meni eslab qolish” bo‘lmasa 12 soat, bo‘lsa 30 kun amal qiladi."
          action={<Button size="sm" variant="outline" disabled={!sessions || sessions.length <= 1} onClick={async () => { const r = await api<{ revoked: number }>('/api/auth/sessions', { method: 'DELETE' }); push('success', `${r.revoked} ta sessiya yopildi`); void loadSessions(); }}>Boshqa sessiyalarni yopish</Button>}
        />
        <CardBody>
          <ul className="divide-y divide-line">
            {sessions?.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-navy">{s.userAgent ?? 'Noma’lum qurilma'}</span>
                  <span className="text-xs text-muted">IP: {s.ip ?? '—'} · ochilgan: {formatDateTime(s.createdAt, timezone)} · faollik: {formatRelative(s.lastSeenAt)}</span>
                </span>
                {s.current && <Badge tone="green">joriy</Badge>}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const { push } = useToast();
  type Prefs = { notifyCritical: boolean; notifyWarning: boolean; notifyInfo: boolean; notifyControl: boolean };
  const { data: prefs, setData: setPrefs } = useApiData<Prefs>('/api/organization/notification-prefs');
  if (!prefs) return <Card className="p-5 text-sm text-muted">Yuklanmoqda...</Card>;
  const toggle = async (k: keyof Prefs) => {
    const prev = prefs;
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(() => next);
    try {
      await api('/api/organization/notification-prefs', { method: 'PUT', body: next });
      push('success', 'Saqlandi');
    } catch (e) {
      setPrefs(() => prev);
      push('error', errorMessage(e));
    }
  };
  return (
    <Card>
      <CardHeader title="Bildirishnoma sozlamalari" description="Joriy tashkilot uchun. Email/Telegram kanallari keyingi bosqichda — hozircha ilova ichida." />
      <CardBody className="space-y-4">
        <Checkbox label="Jiddiy ogohlantirishlar" description="Masalan, uzoq vaqt ma’lumot kelmasligi, quvvat baseline’dan 50%+ yuqori" checked={prefs.notifyCritical} onChange={() => toggle('notifyCritical')} />
        <Checkbox label="Ogohlantirishlar" description="Ishlab chiqarish signali yo‘q, keskin o‘zgarish va h.k." checked={prefs.notifyWarning} onChange={() => toggle('notifyWarning')} />
        <Checkbox label="Ma’lumot darajasidagi xabarlar" description="Uzoq kutish rejimi" checked={prefs.notifyInfo} onChange={() => toggle('notifyInfo')} />
        <Checkbox label="Boshqaruv so‘rovlari" description="Tasdiq kutayotgan va bajarilgan simulyatsiya so‘rovlari" checked={prefs.notifyControl} onChange={() => toggle('notifyControl')} />
      </CardBody>
    </Card>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge tone={ok ? 'green' : 'gray'} icon={ok ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <CircleDashed className="h-3 w-3" aria-hidden />}>
      {label}
    </Badge>
  );
}

interface IntegrationsData {
  integrations: { id: string; type: string; name: string; status: string; tokenPrefix: string | null; lastUsedAt: string | null; createdAt: string }[];
  providers: { id: string; name: string; source: string; mode: string; implemented: boolean; description: string }[];
  ai: { llmRequested: boolean; configured: boolean; model: string | null };
  email: boolean;
  payment: boolean;
}

function IntegrationsSection({ canManage, hasIntegrations, timezone, appUrl }: { canManage: boolean; hasIntegrations: boolean; timezone: string; appUrl: string }) {
  const { push } = useToast();
  const { data, reload: load } = useApiData<IntegrationsData>('/api/integrations');
  const [name, setName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  if (!data) return <Card className="p-5 text-sm text-muted">Yuklanmoqda...</Card>;
  const tokens = data.integrations.filter((i) => i.type === 'HTTP_INGEST');
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Integratsiyalar holati" description="Qaysi ulanishlar haqiqatan ishlayotgani ochiq ko‘rsatiladi." />
        <CardBody>
          <ul className="divide-y divide-line">
            {data.providers.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="max-w-2xl">
                  <p className="font-semibold text-navy">{p.name} <span className="text-xs font-normal text-muted">({p.source === 'DEMO' ? 'demo' : 'real'}, {p.mode})</span></p>
                  <p className="text-sm text-muted">{p.description}</p>
                </div>
                <Status ok={p.implemented} label={p.implemented ? 'Mavjud' : 'Mavjud emas'} />
              </li>
            ))}
            <li className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div><p className="font-semibold text-navy">AI provayder (LLM)</p><p className="text-sm text-muted">{data.ai.configured ? `Model: ${data.ai.model}. Kalit faqat serverda saqlanadi.` : 'Sozlanmagan — qoidaga asoslangan fallback ishlaydi (AI_PROVIDER, ANTHROPIC_API_KEY).'}</p></div>
              <Status ok={data.ai.configured} label={data.ai.configured ? 'Ulangan' : 'Ulanmagan'} />
            </li>
            <li className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div><p className="font-semibold text-navy">Email xizmati</p><p className="text-sm text-muted">Parolni tiklash va taklif xatlari hozircha yuborilmaydi.</p></div>
              <Status ok={data.email} label={data.email ? 'Ulangan' : 'Ulanmagan'} />
            </li>
            <li className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div><p className="font-semibold text-navy">To‘lov tizimi</p><p className="text-sm text-muted">Obunalar demo rejimda, to‘lov qabul qilinmaydi.</p></div>
              <Status ok={data.payment} label={data.payment ? 'Ulangan' : 'Ulanmagan'} />
            </li>
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="HTTP ingest tokenlari" icon={<KeyRound className="h-5 w-5 text-brand" aria-hidden />} description="Gateway yoki skript real o‘lchovlarni yuborishi uchun. Token faqat bir marta ko‘rsatiladi; bazada faqat hash saqlanadi." action={!hasIntegrations && <Badge tone="navy">Pro</Badge>} />
        <CardBody className="space-y-4">
          {token && (
            <Notice tone="warning" title="Tokenni hozir saqlab oling">
              <span className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-white px-2 py-1 font-mono text-navy ring-1 ring-line">{token}</code>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(token).then(() => push('success', 'Nusxalandi'))}><Copy className="h-3.5 w-3.5" aria-hidden /> Nusxalash</Button>
              </span>
            </Notice>
          )}
          {tokens.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {tokens.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    <span className="font-semibold text-navy">{t.name}</span> <span className="font-mono text-xs text-muted">{t.tokenPrefix}…</span>
                    <span className="block text-xs text-muted">Yaratilgan: {formatDateTime(t.createdAt, timezone)} · oxirgi foydalanish: {t.lastUsedAt ? formatRelative(t.lastUsedAt) : 'hali yo‘q'}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={t.status === 'ACTIVE' ? 'green' : 'gray'}>{t.status === 'ACTIVE' ? 'Faol' : 'Bekor qilingan'}</Badge>
                    {canManage && t.status === 'ACTIVE' && <Button size="sm" variant="ghost" className="text-danger" onClick={async () => { await api(`/api/integrations/${t.id}`, { method: 'DELETE' }); push('success', 'Token bekor qilindi'); void load(); }} aria-label={`${t.name} tokenini bekor qilish`}><Trash2 className="h-4 w-4" /></Button>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            hasIntegrations ? (
              <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); try { const r = await api<{ token: string }>('/api/integrations', { body: { name } }); setToken(r.token); setName(''); void load(); } catch (err) { push('error', errorMessage(err)); } }}>
                <label htmlFor="tok-name" className="sr-only">Token nomi</label>
                <Input id="tok-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Sex A gateway" className="max-w-xs" />
                <Button type="submit" disabled={name.trim().length < 2}><Plus className="h-4 w-4" aria-hidden /> Token yaratish</Button>
              </form>
            ) : (
              <Notice tone="info">HTTP ingest integratsiyasi Pro tarifida. <Link href="/app/billing" className="font-semibold text-brand">Tariflar</Link></Notice>
            )
          )}
          <details className="rounded-xl bg-surface p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-navy">So‘rov namunasi</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-navy p-3 text-xs text-white">{`curl -X POST ${appUrl}/api/ingest \\
  -H "Authorization: Bearer ec_..." \\
  -H "Content-Type: application/json" \\
  -d '{"readings":[{"sensorId":"GW-01-SVR","timestamp":"2026-01-01T10:00:00+05:00",
        "powerKw":8.4,"intervalSeconds":60,"isProducing":true}]}'`}</pre>
            <p className="mt-2 text-xs text-muted">Uskunaning “Ma’lumot manbasi” — Real, “Sensor identifikatori” esa sensorId bilan bir xil bo‘lishi kerak. Batafsil: docs/INTEGRATIONS.md</p>
          </details>
        </CardBody>
      </Card>
    </div>
  );
}

export function SettingsView(props: {
  user: { name: string; email: string; mustChangePassword: boolean };
  role: OrgRoleName;
  org: { name: string; timezone: string; currency: string };
  tariff: number | null;
  planName: string;
  canManageIntegrations: boolean;
  hasIntegrations: boolean;
  appUrl: string;
}) {
  return (
    <div>
      <PageHeader title="Sozlamalar" description="Profil, xavfsizlik, bildirishnomalar va integratsiyalar." />
      <Tabs
        tabs={[
          { id: 'profile', label: 'Profil', content: <ProfileSection user={props.user} role={props.role} orgName={props.org.name} /> },
          { id: 'security', label: 'Xavfsizlik va sessiyalar', content: <SecuritySection timezone={props.org.timezone} mustChange={props.user.mustChangePassword} /> },
          { id: 'notifications', label: 'Bildirishnomalar', content: <NotificationsSection /> },
          { id: 'integrations', label: 'Integratsiyalar', content: <IntegrationsSection canManage={props.canManageIntegrations} hasIntegrations={props.hasIntegrations} timezone={props.org.timezone} appUrl={props.appUrl} /> },
          {
            id: 'system',
            label: 'Tizim',
            content: (
              <Card>
                <CardHeader title="Tizim sozlamalari" description="Tashkilot darajasidagi sozlamalar Korxona sahifasida boshqariladi." />
                <CardBody>
                  <dl className="grid max-w-xl grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-muted">Vaqt zonasi</dt><dd className="font-medium text-navy">{props.org.timezone}</dd>
                    <dt className="text-muted">Valyuta</dt><dd className="font-medium text-navy">{props.org.currency}</dd>
                    <dt className="text-muted">Joriy kWh narxi</dt><dd className="font-medium text-navy">{props.tariff !== null ? formatMoney(props.tariff, props.org.currency) : '—'}</dd>
                    <dt className="text-muted">Tarif rejasi</dt><dd className="font-medium text-navy">{props.planName}</dd>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link href="/app/organization#info" className="font-semibold text-brand">Vaqt zonasi va valyuta →</Link>
                    <Link href="/app/organization#tariff" className="font-semibold text-brand">kWh narxi →</Link>
                    <Link href="/app/organization#categories" className="font-semibold text-brand">Uskuna kategoriyalari →</Link>
                    <Link href="/app/billing" className="font-semibold text-brand">Tarif va obuna →</Link>
                  </div>
                </CardBody>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
