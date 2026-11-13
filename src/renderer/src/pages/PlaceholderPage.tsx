import { Clock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { uz } from '../i18n/uz';

/**
 * Hali tayyor bo'lmagan bo'lim. Funksiya ishlayotgandek ko'rsatilmaydi,
 * qaysi bosqichda qo'shilishi aniq yoziladi.
 */
export function PlaceholderPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <div className="page">
      <PageHeader title={title} />
      <section className="card card--muted placeholder">
        <span className="badge badge--neutral">
          <Clock size={14} aria-hidden="true" />
          {uz.common.comingSoon} · {uz.common.phase(phase)}
        </span>
        <p>{description}</p>
      </section>
    </div>
  );
}
