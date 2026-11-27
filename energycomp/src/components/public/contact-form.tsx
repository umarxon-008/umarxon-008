'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Textarea } from '@/components/ui/form';
import { api, errorMessage, ApiClientError } from '@/lib/api-client';

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending');
    setError(null);
    setFieldErrors({});
    try {
      await api('/api/contact', { body: { name: fd.get('name'), email: fd.get('email'), message: fd.get('message') } });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(errorMessage(err));
      if (err instanceof ApiClientError) setFieldErrors(err.fieldErrors());
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-card border border-[#c4ecd9] bg-energy-50 p-6 text-sm text-navy">
        Rahmat! Xabaringiz qabul qilindi.
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-line bg-white p-6 shadow-card" noValidate>
      <FormError message={error} />
      <Field label="Ismingiz" required error={fieldErrors.name}>
        {(p) => <Input name="name" autoComplete="name" required {...p} />}
      </Field>
      <Field label="Email" required error={fieldErrors.email}>
        {(p) => <Input name="email" type="email" autoComplete="email" required {...p} />}
      </Field>
      <Field label="Xabar" required error={fieldErrors.message}>
        {(p) => <Textarea name="message" required {...p} />}
      </Field>
      <Button type="submit" loading={state === 'sending'}>Yuborish</Button>
    </form>
  );
}
