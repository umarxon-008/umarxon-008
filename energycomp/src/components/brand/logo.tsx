import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1677F2" />
      <path d="M22.5 7 11 22.5h8l-2 10.5 12-16h-8.2L22.5 7Z" fill="#fff" />
      <circle cx="31" cy="31" r="5" fill="#20B879" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className="h-8 w-8" />
      <span className={cn('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-navy')}>
        Energy<span className="text-brand">Comp</span>
      </span>
    </span>
  );
}
