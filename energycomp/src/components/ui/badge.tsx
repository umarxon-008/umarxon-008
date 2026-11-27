import { cn } from '@/lib/utils';

type Tone = 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'gray' | 'navy' | 'violet';

const tones: Record<Tone, string> = {
  blue: 'bg-brand-50 text-brand-600 ring-brand-100',
  green: 'bg-energy-50 text-energy-600 ring-[#c4ecd9]',
  amber: 'bg-amber-50 text-[#9a6b00] ring-[#f6e2a8]',
  orange: 'bg-orange-50 text-orange ring-[#f8d3b8]',
  red: 'bg-danger-50 text-danger ring-[#f6c9cb]',
  gray: 'bg-[#eef2f7] text-muted ring-line',
  navy: 'bg-navy text-white ring-navy',
  violet: 'bg-[#f2effd] text-[#5b3fc4] ring-[#d5ccf7]',
};

export function Badge({
  tone = 'gray',
  className,
  children,
  icon,
  title,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
