import { formatRelative } from '@/lib/format';

/** Nisbiy vaqt ("5 daqiqa oldin"). Server va brauzer soatlari farqi gidratatsiya ogohlantirishini bermasligi uchun. */
export function RelTime({ value }: { value: string | Date | null | undefined }) {
  const iso = value ? new Date(value).toISOString() : undefined;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatRelative(value)}
    </time>
  );
}
