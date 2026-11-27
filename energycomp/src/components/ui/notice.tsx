import { Info, ShieldAlert, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'demo' | 'warning';
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const cfg = {
    info: { cls: 'border-brand-100 bg-brand-50 text-navy', icon: <Info className="h-4 w-4 text-brand" aria-hidden /> },
    demo: { cls: 'border-[#d5ccf7] bg-[#f6f3fe] text-navy', icon: <FlaskConical className="h-4 w-4 text-[#5b3fc4]" aria-hidden /> },
    warning: { cls: 'border-[#f6e2a8] bg-amber-50 text-navy', icon: <ShieldAlert className="h-4 w-4 text-[#9a6b00]" aria-hidden /> },
  }[tone];
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', cfg.cls, className)}>
      <div className="mt-0.5 shrink-0">{cfg.icon}</div>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5', 'text-muted [&_strong]:text-navy')}>{children}</div>
      </div>
    </div>
  );
}
