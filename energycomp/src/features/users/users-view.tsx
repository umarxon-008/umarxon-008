'use client';

import { RelTime } from '@/components/ui/rel-time';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { api, ApiClientError, errorMessage } from '@/lib/api-client';
import { ORG_ROLES, PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS, type OrgRoleName } from '@/lib/permissions';

interface Member {
  id: string;
  role: OrgRoleName;
  user: { id: string; name: string; email: string; lastLoginAt: string | null; mustChangePassword: boolean };
}

export function UsersView({ members, canManage, currentUserId, limit }: { members: Member[]; canManage: boolean; currentUserId: string; limit: { used: number; max: number } }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'VIEWER' as OrgRoleName });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string | null } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrs({});
    setError(null);
    try {
      const res = await api<{ temporaryPassword: string | null }>('/api/members', { body: form });
      setCreated({ email: form.email, temporaryPassword: res.temporaryPassword });
      setOpen(false);
      setForm({ name: '', email: '', role: 'VIEWER' });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiClientError) setErrs(err.fieldErrors());
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: Member, role: OrgRoleName) {
    try {
      await api(`/api/members/${m.id}`, { method: 'PATCH', body: { role } });
      push('success', `${m.user.name}: ${ROLE_LABELS[role]}`);
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await api(`/api/members/${removing.id}`, { method: 'DELETE' });
      push('success', `${removing.user.name} tashkilotdan chiqarildi`);
      setRemoving(null);
      router.refresh();
    } catch (e) {
      push('error', errorMessage(e));
    }
  }

  const permRows = Object.entries(PERMISSIONS);
  return (
    <div>
      <PageHeader
        title="Foydalanuvchilar va rollar"
        description={`${limit.used} / ${limit.max} foydalanuvchi (tarif limiti)`}
        actions={canManage && <Button onClick={() => { setError(null); setErrs({}); setOpen(true); }} disabled={limit.used >= limit.max}><Plus className="h-4 w-4" aria-hidden /> Foydalanuvchi qo‘shish</Button>}
      />
      {created && (
        <Notice tone={created.temporaryPassword ? 'warning' : 'info'} title="Foydalanuvchi qo‘shildi" className="mb-4">
          {created.temporaryPassword ? (
            <>
              Email xizmati ulanmagan. Quyidagi vaqtinchalik parolni <strong>{created.email}</strong> ga xavfsiz kanal orqali yetkazing — u faqat hozir ko‘rsatiladi.
              Birinchi kirishda parolni almashtirish majburiy.
              <span className="mt-2 flex items-center gap-2">
                <code className="rounded-lg bg-white px-2 py-1 font-mono text-navy ring-1 ring-line">{created.temporaryPassword}</code>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(created.temporaryPassword!).then(() => push('success', 'Nusxalandi'))}><Copy className="h-3.5 w-3.5" aria-hidden /> Nusxalash</Button>
              </span>
            </>
          ) : (
            <>Mavjud hisob ({created.email}) tashkilotga qo‘shildi — u o‘z paroli bilan kiradi.</>
          )}
        </Notice>
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr><th scope="col" className="px-4 py-3">Foydalanuvchi</th><th scope="col" className="px-4 py-3">Rol</th><th scope="col" className="px-4 py-3">Oxirgi kirish</th>{canManage && <th className="px-4 py-3"><span className="sr-only">Amallar</span></th>}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{m.user.name} {m.user.id === currentUserId && <Badge tone="blue">siz</Badge>}</p>
                    <p className="text-xs text-muted">{m.user.email}{m.user.mustChangePassword && ' · vaqtinchalik parol'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Select value={m.role} onChange={(e) => changeRole(m, e.target.value as OrgRoleName)} className="h-9 w-56" aria-label={`${m.user.name} roli`}>
                        {ORG_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </Select>
                    ) : (
                      <Badge tone="gray">{ROLE_LABELS[m.role]}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{m.user.lastLoginAt ? <RelTime value={m.user.lastLoginAt} /> : 'hali kirmagan'}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {m.user.id !== currentUserId && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRemoving(m)} aria-label={`${m.user.name} — chiqarish`}><Trash2 className="h-4 w-4" /></Button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Rollar" />
        <CardBody>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ORG_ROLES.map((r) => (
              <div key={r} className="rounded-xl border border-line p-3">
                <p className="font-semibold text-navy">{ROLE_LABELS[r]}</p>
                <p className="mt-1 text-xs text-muted">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-brand">Batafsil ruxsatlar</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="text-left text-muted"><tr><th scope="col" className="px-2 py-1.5">Ruxsat</th>{ORG_ROLES.map((r) => <th key={r} scope="col" className="px-2 py-1.5 text-center">{ROLE_LABELS[r].split(' ')[0]}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">
                  {permRows.map(([p, roles]) => (
                    <tr key={p}><td className="px-2 py-1.5 font-mono text-navy">{p}</td>{ORG_ROLES.map((r) => <td key={r} className="px-2 py-1.5 text-center">{(roles as readonly string[]).includes(r) ? <span className="text-energy-600">✓<span className="sr-only"> ruxsat bor</span></span> : <span className="text-[#c0cad8]">—<span className="sr-only"> ruxsat yo‘q</span></span>}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Foydalanuvchi qo‘shish" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" form="member-form" loading={busy}>Qo‘shish</Button></>}>
        <form id="member-form" onSubmit={add} className="space-y-4" noValidate>
          <FormError message={error} />
          <Field label="Ism-familiya" required error={errs.name}>{(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Email" required error={errs.email}>{(p) => <Input {...p} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
          <Field label="Rol" required hint={ROLE_DESCRIPTIONS[form.role]}>
            {(p) => <Select {...p} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as OrgRoleName })}>{ORG_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select>}
          </Field>
        </form>
      </Modal>
      <Modal open={Boolean(removing)} onClose={() => setRemoving(null)} size="sm" title="Tashkilotdan chiqarish" description={removing ? `${removing.user.name} bu tashkilot ma’lumotlariga kira olmaydi. Hisobi o‘chirilmaydi.` : undefined} footer={<><Button variant="outline" onClick={() => setRemoving(null)}>Bekor qilish</Button><Button variant="danger" onClick={remove}>Chiqarish</Button></>}>
        <p className="text-sm text-muted">Amal audit jurnaliga yoziladi.</p>
      </Modal>
    </div>
  );
}
