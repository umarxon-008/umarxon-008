'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const inputBase =
  'block rounded-xl border border-line bg-white px-3 text-sm text-navy placeholder:text-[#94a3b8] transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-danger';

/** Kenglik berilmagan bo'lsa — to'liq kenglik (w-full); berilgan bo'lsa, u ustun turadi. */
const width = (className?: string) => (/(^|\s)w-/.test(className ?? '') ? '' : 'w-full');

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputBase, width(className), 'h-10', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(inputBase, width(className), 'h-10 pr-8', className)} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputBase, 'w-full min-h-[88px] py-2', className)} {...props} />;
  },
);

/** Label + input + xato/yordam matni. children funksiyasi id va aria atributlarini oladi. */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline gap-0.5">
        <label htmlFor={id} className="block text-sm font-medium text-navy">
          {label}
        </label>
        {required && (
          <span className="text-sm text-danger" aria-hidden>
            *
          </span>
        )}
      </div>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, ...(required ? { 'aria-required': true } : {}) })}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-[#1677F2]"
        {...props}
      />
      <label htmlFor={id} className="text-sm text-navy">
        {label}
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-[#f6c9cb] bg-danger-50 px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}
