import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/login-form';
import { getAuthContext } from '@/server/auth/context';

export const metadata: Metadata = { title: 'Kirish' };

export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx?.org) redirect('/app/dashboard');
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Tizimga kirish</h1>
      <p className="mt-1 text-sm text-muted">
        Hisobingiz yo‘qmi?{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Ro‘yxatdan o‘ting
        </Link>
      </p>
      <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
        <Suspense>
          <LoginForm showDemoHint={process.env.NODE_ENV !== 'production' || process.env.SHOW_DEMO_HINT === 'true'} />
        </Suspense>
      </div>
    </div>
  );
}
