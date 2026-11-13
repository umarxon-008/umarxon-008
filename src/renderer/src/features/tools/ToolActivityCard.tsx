import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  Loader2,
  ShieldQuestion,
  Wrench,
} from 'lucide-react';
import type { ToolActivity } from '@shared/ipc';
import { STATUS_LABELS } from './labels';

const ICONS = {
  running: <Loader2 size={14} className="spin" aria-hidden="true" />,
  awaiting_confirmation: <ShieldQuestion size={14} aria-hidden="true" />,
  success: <CheckCircle2 size={14} aria-hidden="true" />,
  unverified: <HelpCircle size={14} aria-hidden="true" />,
  denied: <CircleSlash size={14} aria-hidden="true" />,
  error: <AlertTriangle size={14} aria-hidden="true" />,
  unknown: <HelpCircle size={14} aria-hidden="true" />,
} as const;

/** Suhbatdagi amal kartasi (prompt §18: Tool activity cards). Holat ikonka, matn va rang bilan. */
export function ToolActivityCard({ activity }: { activity: ToolActivity }) {
  return (
    <div className={`tool-card tool-card--${activity.status}`} role="status">
      <span className="tool-card__icon">
        <Wrench size={14} aria-hidden="true" />
      </span>
      <div className="tool-card__body">
        <strong>{activity.summary}</strong>
        {activity.resultMessage && <small>{activity.resultMessage}</small>}
      </div>
      <span className="tool-card__status">
        {ICONS[activity.status]}
        {STATUS_LABELS[activity.status]}
      </span>
    </div>
  );
}
