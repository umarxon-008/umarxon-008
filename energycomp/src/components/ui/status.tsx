import { Activity, CircleAlert, CirclePause, CircleStop, FlaskConical, Info, OctagonAlert, Radio, TriangleAlert, WifiOff } from 'lucide-react';
import { Badge } from './badge';
import {
  ALERT_STATUS_LABELS,
  CONFIDENCE_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  type AlertStatusName,
  type ConfidenceName,
  type EquipmentStatusName,
  type SeverityName,
} from '@/lib/labels';

const STATUS_TONE = { RUNNING: 'green', STANDBY: 'amber', STOPPED: 'gray', WARNING: 'orange', OFFLINE: 'red' } as const;
const STATUS_ICON = {
  RUNNING: Activity,
  STANDBY: CirclePause,
  STOPPED: CircleStop,
  WARNING: TriangleAlert,
  OFFLINE: WifiOff,
} as const;

export function StatusBadge({ status }: { status: EquipmentStatusName }) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]} icon={<Icon className="h-3 w-3" aria-hidden />}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function StatusIcon({ status, className }: { status: EquipmentStatusName; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon className={className} aria-hidden />;
}

const SEV_TONE = { INFO: 'blue', WARNING: 'orange', CRITICAL: 'red' } as const;
const SEV_ICON = { INFO: Info, WARNING: CircleAlert, CRITICAL: OctagonAlert } as const;

export function SeverityBadge({ severity }: { severity: SeverityName }) {
  const Icon = SEV_ICON[severity];
  return (
    <Badge tone={SEV_TONE[severity]} icon={<Icon className="h-3 w-3" aria-hidden />}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

const ALERT_TONE = { NEW: 'blue', ACKNOWLEDGED: 'amber', RESOLVED: 'green', DISMISSED: 'gray' } as const;
export function AlertStatusBadge({ status }: { status: AlertStatusName }) {
  return <Badge tone={ALERT_TONE[status]}>{ALERT_STATUS_LABELS[status]}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceName }) {
  const tone = confidence === 'HIGH' ? 'green' : confidence === 'MEDIUM' ? 'amber' : 'gray';
  return <Badge tone={tone}>Ishonchlilik: {CONFIDENCE_LABELS[confidence]}</Badge>;
}

export function SourceBadge({ source, compact }: { source: 'DEMO' | 'REAL'; compact?: boolean }) {
  return source === 'DEMO' ? (
    <Badge tone="violet" icon={<FlaskConical className="h-3 w-3" aria-hidden />} title="Simulyatsiya qilingan ma'lumot — real o'lchov emas">
      {compact ? 'Demo' : SOURCE_LABELS.DEMO}
    </Badge>
  ) : (
    <Badge tone="green" icon={<Radio className="h-3 w-3" aria-hidden />} title="Haqiqiy sensor/gateway o'lchovi">
      {compact ? 'Real' : SOURCE_LABELS.REAL}
    </Badge>
  );
}
