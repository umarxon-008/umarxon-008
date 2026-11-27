'use client';

import { ErrorState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-card border border-line bg-white shadow-card">
      <ErrorState
        title="Sahifani yuklab bo‘lmadi"
        message={error.digest ? `Serverda xato yuz berdi (kod: ${error.digest}).` : error.message}
        action={<Button onClick={reset}>Qayta urinish</Button>}
      />
    </div>
  );
}
