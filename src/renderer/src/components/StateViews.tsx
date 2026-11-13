import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { uz } from '../i18n/uz';

export function LoadingState({
  fullscreen = false,
  label = uz.common.loading,
}: {
  fullscreen?: boolean;
  label?: string;
}) {
  return (
    <div className={`state${fullscreen ? ' state--fullscreen' : ''}`} role="status" aria-live="polite">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  fullscreen = false,
}: {
  message: string;
  onRetry?: () => void;
  fullscreen?: boolean;
}) {
  return (
    <div className={`state state--error${fullscreen ? ' state--fullscreen' : ''}`} role="alert">
      <AlertTriangle size={28} aria-hidden="true" />
      <strong>{uz.errors.title}</strong>
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {uz.common.retry}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <Inbox size={24} aria-hidden="true" />
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}
