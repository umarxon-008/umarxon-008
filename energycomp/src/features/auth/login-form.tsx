'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/notice';
import { api, errorMessage } from '@/lib/api-client';
import { loginSchema } from '@/schemas/auth';
import { PasswordInput } from './password-input';

type Values = z.input<typeof loginSchema>;

function safeNext(next: string | null): string {
  return next && next.startsWith('/app') && !next.startsWith('//') ? next : '/app/dashboard';
}

export function LoginForm({ showDemoHint }: { showDemoHint: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await api<{ mustChangePassword: boolean }>('/api/auth/login', { body: values });
      router.push(res.mustChangePassword ? '/app/settings?mustChange=1#security' : safeNext(params.get('next')));
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {params.get('expired') && <Notice tone="warning">Sessiya muddati tugadi. Qaytadan kiring.</Notice>}
      {params.get('reset') && <Notice tone="info">Parol yangilandi. Yangi parol bilan kiring.</Notice>}
      {params.get('error') === 'no-org' && <Notice tone="warning">Hisobingiz hech qaysi tashkilotga biriktirilmagan. Administratorga murojaat qiling.</Notice>}
      <FormError message={error} />
      <Field label="Email" required error={formState.errors.email?.message}>
        {(p) => <Input type="email" autoComplete="email" {...p} {...register('email')} />}
      </Field>
      <Field label="Parol" required error={formState.errors.password?.message}>
        {(p) => <PasswordInput autoComplete="current-password" {...p} {...register('password')} />}
      </Field>
      <div className="flex items-center justify-between gap-3">
        <Checkbox label="Meni eslab qolish (30 kun)" {...register('remember')} />
        <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
          Parolni unutdingizmi?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        Kirish
      </Button>
      {showDemoHint && (
        <Notice tone="demo" title="Demo kirish (faqat development)">
          <code className="text-navy">admin@energycomp.uz</code> / <code className="text-navy">Demo12345</code>. Boshqa rollar:
          manager@, engineer@, viewer@energycomp.uz.
        </Notice>
      )}
    </form>
  );
}
