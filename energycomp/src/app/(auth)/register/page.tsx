import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = { title: 'Ro‘yxatdan o‘tish' };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Ro‘yxatdan o‘tish</h1>
      <p className="mt-1 text-sm text-muted">
        Hisobingiz bormi?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Kirish
        </Link>
      </p>
      <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
        <RegisterForm />
      </div>
    </div>
  );
}
