import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/features/auth/password-reset-forms';
import { Notice } from '@/components/ui/notice';

export const metadata: Metadata = { title: 'Yangi parol' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Yangi parol o‘rnatish</h1>
      <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Notice tone="warning">
            Havola noto‘liq. <Link href="/forgot-password" className="font-semibold text-brand">Qaytadan so‘rov yuboring</Link>.
          </Notice>
        )}
      </div>
    </div>
  );
}
