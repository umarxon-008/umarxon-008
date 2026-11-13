import type { ReactNode } from 'react';
import {
  BatteryCharging,
  BatteryMedium,
  Cpu,
  Globe,
  HardDrive,
  MemoryStick,
  MonitorCheck,
  Pause,
  Play,
  WifiOff,
} from 'lucide-react';
import { useSystemMetrics } from './useSystemMetrics';
import { uz } from '../../i18n/uz';

export function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
}

function Meter({ value }: { value: number }) {
  return (
    <div className="meter" role="presentation">
      <div className="meter__fill" style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  sub,
  percent,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  percent?: number | null;
  tone?: 'ok' | 'warn' | 'off';
}) {
  return (
    <li className="metric">
      <span className="metric__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="metric__body">
        <div className="metric__head">
          <span className="metric__label">
            {label}
            {sub && <span className={`metric__sub metric__sub--${tone ?? 'ok'}`}>[{sub}]</span>}
          </span>
          <span className="metric__value">{value}</span>
        </div>
        {percent !== undefined && percent !== null && <Meter value={percent} />}
      </div>
    </li>
  );
}

/** "Kompyuter holati" paneli: barcha qiymatlar real manbadan olinadi. */
export function SystemStatusPanel() {
  const { metrics, error, paused, setPaused, battery } = useSystemMetrics();
  const m = metrics;

  const batteryRow =
    battery === null ? (
      <Row icon={<BatteryMedium size={18} />} label={uz.monitoring.battery} value={uz.monitoring.measuring} />
    ) : battery === 'unsupported' ? (
      <Row
        icon={<BatteryMedium size={18} />}
        label={uz.monitoring.battery}
        value={uz.monitoring.unavailable}
      />
    ) : (
      <Row
        icon={battery.charging ? <BatteryCharging size={18} /> : <BatteryMedium size={18} />}
        label={uz.monitoring.battery}
        value={`${Math.round(battery.level * 100)}%`}
        sub={battery.charging ? uz.monitoring.charging : undefined}
        percent={Math.round(battery.level * 100)}
      />
    );

  return (
    <section className="card status-panel" aria-labelledby="status-title">
      <header className="status-panel__header">
        <h2 id="status-title">{uz.monitoring.title}</h2>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? uz.monitoring.resume : uz.monitoring.pause}
          title={paused ? uz.monitoring.resume : uz.monitoring.pause}
        >
          {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <ul className="metrics">
        <Row
          icon={<Cpu size={18} />}
          label={uz.monitoring.cpu}
          value={m?.cpu.percent != null ? `${m.cpu.percent}%` : uz.monitoring.measuring}
          percent={m?.cpu.percent ?? null}
        />
        <Row
          icon={<MemoryStick size={18} />}
          label={uz.monitoring.ram}
          value={m ? `${m.memory.percent}%` : uz.monitoring.measuring}
          percent={m?.memory.percent ?? null}
        />
        <Row
          icon={<HardDrive size={18} />}
          label={uz.monitoring.disk}
          value={m ? (m.disk ? `${m.disk.percent}%` : uz.monitoring.unavailable) : uz.monitoring.measuring}
          percent={m?.disk?.percent ?? null}
        />
        <Row
          icon={m && !m.online ? <WifiOff size={18} /> : <Globe size={18} />}
          label={uz.monitoring.internet}
          sub={m ? (m.online ? uz.monitoring.active : uz.monitoring.disconnected) : undefined}
          tone={m?.online ? 'ok' : 'off'}
          value={
            m ? (m.online ? uz.monitoring.connected : uz.monitoring.disconnected) : uz.monitoring.measuring
          }
        />
        {batteryRow}
        <Row
          icon={<MonitorCheck size={18} />}
          label={m ? m.os.name : uz.monitoring.os}
          sub={uz.monitoring.active}
          value={uz.monitoring.active}
        />
      </ul>

      <p className="status-panel__footer">
        {paused
          ? uz.monitoring.paused
          : m
            ? `${uz.monitoring.updatedAt(new Date(m.sampledAt).toLocaleTimeString('uz-UZ'))}${
                m.disk ? ` · ${formatBytes(m.disk.totalBytes - m.disk.usedBytes)} bo‘sh` : ''
              }`
            : uz.common.loading}
      </p>
    </section>
  );
}
