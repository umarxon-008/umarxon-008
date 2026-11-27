'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { api, errorMessage, ApiClientError } from '@/lib/api-client';
import { PasswordInput } from './password-input';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ devResetUrl: string | null; emailConfigured: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    setLoading(true);
    setError(null);
    try {
      setDone(await api('/api/auth/forgot-password', { body: { email } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  if (done) {
    return (
      <div className="space-y-4">
        <Notice tone="info" title="So‘rov qabul qilindi">
          Agar bu email ro‘yxatdan o‘tgan bo‘lsa, parolni tiklash havolasi yaratildi (1 soat amal qiladi).
          {!done.emailConfigured && ' Email xizmati hali ulanmagan — havola foydalanuvchiga avtomatik yuborilmaydi; administratorga murojaat qiling.'}
        </Notice>
        {done.devResetUrl && (
          <Notice tone="demo" title="Development rejimi">
            Email o‘rniga havola shu yerda ko‘rsatiladi:{' '}
            <a href={done.devResetUrl} className="break-all font-semibold text-brand underline">
              parolni tiklash
            </a>
          </Notice>
        )}
        <Link href="/login" className="text-sm font-semibold text-brand hover:underline">
          ← Kirish sahifasiga qaytish
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label="Email" required>
        {(p) => <Input name="email" type="email" autoComplete="email" required {...p} />}
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Tiklash havolasini olish
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await api('/api/auth/reset-password', { body: { token, password: fd.get('password'), confirmPassword: fd.get('confirmPassword') } });
      router.push('/login?reset=1');
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiClientError) setFieldErrors(err.fieldErrors());
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label="Yangi parol" required error={fieldErrors.password} hint="Kamida 8 belgi, harf va raqam">
        {(p) => <PasswordInput name="password" autoComplete="new-password" {...p} />}
      </Field>
      <Field label="Parolni tasdiqlash" required error={fieldErrors.confirmPassword}>
        {(p) => <PasswordInput name="confirmPassword" autoComplete="new-password" {...p} />}
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Parolni yangilash
      </Button>
    </form>
  );
}
