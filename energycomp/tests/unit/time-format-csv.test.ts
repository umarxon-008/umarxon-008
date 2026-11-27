import { describe, expect, it } from 'vitest';
import { addZonedDays, parseZonedDateInput, startOfZonedDay, toZonedDateInput, zonedParts } from '@/lib/time';
import { formatEvidence, formatKw, formatKwh, formatMoney, formatNumber } from '@/lib/format';
import { toCsv } from '@/lib/csv';

describe('vaqt zonasi', () => {
  it('Toshkent kun boshi UTC 19:00 (oldingi kun)', () => {
    const d = startOfZonedDay(new Date('2026-11-27T05:00:00Z'), 'Asia/Tashkent');
    expect(d.toISOString()).toBe('2026-11-26T19:00:00.000Z');
    expect(zonedParts(d, 'Asia/Tashkent').hour).toBe(0);
  });
  it('sana kiritish formatini aylantirish', () => {
    const d = parseZonedDateInput('2026-03-15', 'Asia/Tashkent')!;
    expect(d.toISOString()).toBe('2026-03-14T19:00:00.000Z');
    expect(toZonedDateInput(d, 'Asia/Tashkent')).toBe('2026-03-15');
    expect(parseZonedDateInput('15.03.2026', 'UTC')).toBeNull();
    expect(addZonedDays(d, 1, 'Asia/Tashkent').toISOString()).toBe('2026-03-15T19:00:00.000Z');
  });
});

describe('formatlash', () => {
  it('raqamlar: bo‘shliq bilan guruhlash va vergul', () => {
    expect(formatNumber(1234567.89, 1)).toBe('1 234 567,9');
    expect(formatNumber(10, 2)).toBe('10');
    expect(formatNumber(null)).toBe('—');
    expect(formatKw(9.876)).toBe('9,88 kW');
    expect(formatKwh(1500)).toBe('1 500 kWh');
    expect(formatMoney(1500.4, 'UZS')).toBe("1 500 so'm");
  });
  it('dalil: vaqt mahalliy zonada, raqam formatlangan', () => {
    expect(formatEvidence({ value: 9.723, unit: 'kW' }, 'UTC')).toBe('9,723 kW');
    expect(formatEvidence({ value: 'x', at: '2026-01-01T10:00:00Z' }, 'Asia/Tashkent')).toBe('1-yan 2026, 15:00');
  });
});

describe('CSV', () => {
  it('maxsus belgilar va formula injection’dan himoya', () => {
    const csv = toCsv(['a', 'b'], [['=SUM(A1)', 'x,"y"'], [1.5, null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain(`'=SUM(A1)`);
    expect(csv).toContain('"x,""y"""');
    expect(csv).toContain('1.5,');
  });
});
