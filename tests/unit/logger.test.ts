import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLogger, redact } from '../../src/main/logging/logger';
import { greetingFor } from '../../src/renderer/src/lib/greeting';

describe('redact', () => {
  it('maxfiy kalitlarni yashiradi', () => {
    const out = redact({
      apiKey: 'AIza-secret',
      nested: { Authorization: 'Bearer x', password: 'p', ok: 'visible' },
      list: [{ token: 't' }],
      transcript: 'shaxsiy gap',
    }) as Record<string, unknown>;
    const json = JSON.stringify(out);
    expect(json).not.toContain('AIza-secret');
    expect(json).not.toContain('Bearer x');
    expect(json).not.toContain('shaxsiy gap');
    expect(json).toContain('visible');
  });

  it('uzun matnni qisqartiradi', () => {
    expect(String(redact('a'.repeat(2000))).length).toBeLessThan(600);
  });
});

describe('createLogger', () => {
  it('JSON qatorlarini yozadi va maxfiy qiymatlarni faylga tushirmaydi', () => {
    const dir = mkdtempSync(join(tmpdir(), 'marius-log-'));
    try {
      const log = createLogger(dir);
      log.info('test.event', { apiKey: 'SECRET123', count: 2 });
      const content = readFileSync(join(dir, 'marius.log'), 'utf8').trim();
      const entry = JSON.parse(content);
      expect(entry).toMatchObject({ level: 'info', event: 'test.event', data: { count: 2 } });
      expect(content).not.toContain('SECRET123');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('greetingFor', () => {
  it('kun vaqtiga mos salom', () => {
    expect(greetingFor(7)).toBe('Xayrli tong');
    expect(greetingFor(13)).toBe('Xayrli kun');
    expect(greetingFor(19)).toBe('Xayrli kech');
    expect(greetingFor(2)).toBe('Xayrli tun');
    expect(greetingFor(23)).toBe('Xayrli tun');
  });
});
