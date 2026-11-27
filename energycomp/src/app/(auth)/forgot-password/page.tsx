import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/password-reset-forms';

export const metadata: Metadata = { title: 'Parolni tiklash' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Parolni tiklash</h1>
      <p className="mt-1 text-sm text-muted">Email manzilingizni kiriting.</p>
      <div className="mt-6 rounded-card border border-line bg-white p-6 shadow-card">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
