'use client';

import { Input, Select } from '@/components/ui/form';
import { Segmented } from '@/components/ui/segmented';

export type Preset = 'today' | '24h' | '7d' | '30d' | 'month' | 'custom';
export type Gran = 'hour' | 'day' | 'week' | 'month';

export interface RangeState {
  preset: Preset;
  granularity: Gran;
  from: string;
  to: string;
}

export function rangeToParams(r: RangeState): URLSearchParams {
  const sp = new URLSearchParams({ preset: r.preset, granularity: r.granularity });
  if (r.preset === 'custom') {
    if (r.from) sp.set('from', r.from);
    if (r.to) sp.set('to', r.to);
  }
  return sp;
}

export function RangeFilter({ value, onChange, maxDate }: { value: RangeState; onChange: (v: RangeState) => void; maxDate: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Segmented
        label="Davr"
        value={value.preset}
        onChange={(preset) => {
          const granularity: Gran = preset === 'today' || preset === '24h' ? 'hour' : value.granularity === 'hour' && preset !== 'custom' ? 'day' : value.granularity;
          onChange({ ...value, preset, granularity });
        }}
        options={[
          { value: 'today', label: 'Bugun' },
          { value: '24h', label: '24 soat' },
          { value: '7d', label: '7 kun' },
          { value: '30d', label: '30 kun' },
          { value: 'month', label: 'Shu oy' },
          { value: 'custom', label: 'Boshqa' },
        ]}
      />
      {value.preset === 'custom' && (
        <div className="flex items-end gap-2">
          <label className="text-xs text-muted">
            Boshlanish
            <Input type="date" value={value.from} max={value.to || maxDate} onChange={(e) => onChange({ ...value, from: e.target.value })} className="mt-1 h-9" />
          </label>
          <label className="text-xs text-muted">
            Tugash
            <Input type="date" value={value.to} min={value.from} max={maxDate} onChange={(e) => onChange({ ...value, to: e.target.value })} className="mt-1 h-9" />
          </label>
        </div>
      )}
      <label className="text-xs text-muted">
        Ko‘rinish
        <Select value={value.granularity} onChange={(e) => onChange({ ...value, granularity: e.target.value as Gran })} className="mt-1 h-9 w-32">
          <option value="hour">Soat</option>
          <option value="day">Kun</option>
          <option value="week">Hafta</option>
          <option value="month">Oy</option>
        </Select>
      </label>
    </div>
  );
}
