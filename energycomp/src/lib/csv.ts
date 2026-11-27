// RFC 4180 CSV. Excel formulalarini ishga tushirib yuborish (CSV injection) oldini olish uchun
// "=", "+", "-", "@" bilan boshlanadigan matn qiymatlar oldiga apostrof qo'yiladi.

export type CsvValue = string | number | boolean | null | undefined | Date;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'number') s = Number.isFinite(value) ? String(value) : '';
  else s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  // BOM — Excel UTF-8 ni to'g'ri ochishi uchun
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
