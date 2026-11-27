import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requirePageContext } from '@/server/auth/context';
import { listOrganizationsForAdmin } from '@/server/services/billing';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Notice } from '@/components/ui/notice';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Platforma admin' };

export default async function AdminPage() {
  const ctx = await requirePageContext();
  if (!ctx.user.isPlatformAdmin) redirect('/app/dashboard?denied=1');
  const orgs = await listOrganizationsForAdmin(ctx);
  return (
    <div>
      <PageHeader title="Platforma administratori" description="Tashkilotlar ro‘yxati (faqat umumiy ko‘rsatkichlar). Tashkilot ichki ma’lumotlari faqat a’zolarga ko‘rinadi." />
      <Notice tone="info" className="mb-5">Tarif narxlari va limitlari: Tariflar sahifasidagi “Narx va limitlar” tugmasi.</Notice>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr><th scope="col" className="px-4 py-3">Tashkilot</th><th scope="col" className="px-4 py-3">Tarif</th><th scope="col" className="px-4 py-3 text-right">A’zolar</th><th scope="col" className="px-4 py-3 text-right">Zavodlar</th><th scope="col" className="px-4 py-3 text-right">Uskunalar</th><th scope="col" className="px-4 py-3">Yaratilgan</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-navy">{o.name} {o.isDemo && <Badge tone="violet">demo</Badge>}</p><p className="text-xs text-muted">{o.industry}</p></td>
                  <td className="px-4 py-3">{o.plan}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.factories}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.equipment}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(o.createdAt, 'Asia/Tashkent')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
