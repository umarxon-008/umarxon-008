'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/form';
import { api, errorMessage, ApiClientError } from '@/lib/api-client';
import { INDUSTRIES } from '@/lib/labels';
import { registerSchema } from '@/schemas/auth';
import { PasswordInput } from './password-input';

type Values = z.input<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError: setFieldError } = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', organizationName: '', industry: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api('/api/auth/register', { body: values });
      router.push('/app/dashboard?welcome=1');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiClientError) {
        for (const [k, v] of Object.entries(e.fieldErrors())) setFieldError(k as keyof Values, { message: v });
      }
    }
  });
  const err = formState.errors;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label="Ism-familiya" required error={err.name?.message}>
        {(p) => <Input autoComplete="name" {...p} {...register('name')} />}
      </Field>
      <Field label="Email" required error={err.email?.message}>
        {(p) => <Input type="email" autoComplete="email" {...p} {...register('email')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Parol" required error={err.password?.message} hint="Kamida 8 belgi, harf va raqam">
          {(p) => <PasswordInput autoComplete="new-password" {...p} {...register('password')} />}
        </Field>
        <Field label="Parolni tasdiqlash" required error={err.confirmPassword?.message}>
          {(p) => <PasswordInput autoComplete="new-password" {...p} {...register('confirmPassword')} />}
        </Field>
      </div>
      <Field label="Tashkilot nomi" required error={err.organizationName?.message}>
        {(p) => <Input autoComplete="organization" {...p} {...register('organizationName')} />}
      </Field>
      <Field label="Sanoat yo‘nalishi" required error={err.industry?.message}>
        {(p) => (
          <Select {...p} {...register('industry')}>
            <option value="">Tanlang...</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div>
        <Checkbox
          label={
            <>
              <Link href="/about#yordam" className="font-semibold text-brand hover:underline">
                Foydalanish shartlari
              </Link>{' '}
              va maxfiylik siyosatiga roziman
            </>
          }
          {...register('acceptTerms')}
        />
        {err.acceptTerms && (
          <p className="mt-1 text-xs font-medium text-danger" role="alert">
            {err.acceptTerms.message}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        Ro‘yxatdan o‘tish
      </Button>
      <p className="text-xs text-muted">Yangi tashkilot Free tarifida yaratiladi. Siz tashkilot egasi (Owner) bo‘lasiz.</p>
    </form>
  );
}
