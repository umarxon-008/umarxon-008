'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-2 px-1 py-3 text-sm text-muted" aria-label="Sahifalash">
      <span>
        {total} ta, {page}/{pages}-sahifa
      </span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Oldingi sahifa">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Keyingi sahifa">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
