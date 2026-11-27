import { Skeleton } from '@/components/ui/states';

export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Yuklanmoqda">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
