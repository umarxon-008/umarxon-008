import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'orange' | 'navy' | 'red';
  className?: string;
}) {
  const toneCls = {
    blue: 'bg-brand-50 text-brand',
    green: 'bg-energy-50 text-energy-600',
    amber: 'bg-amber-50 text-[#a37200]',
    orange: 'bg-orange-50 text-orange',
    red: 'bg-danger-50 text-danger',
    navy: 'bg-navy text-white',
  }[tone];
  return (
    <div className={cn('rounded-card border border-line/70 bg-white p-4 shadow-card sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <div className={cn('rounded-xl p-2', toneCls)}>{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-navy tabular-nums">{value}</p>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
