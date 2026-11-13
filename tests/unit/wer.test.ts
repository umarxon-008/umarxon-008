import { describe, expect, it } from 'vitest';
import { aggregateWer, normalizeUz, wer } from '../../src/renderer/src/lib/wer';
import { TEST_SENTENCES } from '../../src/renderer/src/features/voice/testSentences';

describe('WER (so‘z xatosi darajasi)', () => {
  it('bir xil matn → 0, apostrof turlari va tinish belgilari farq qilmaydi', () => {
    expect(wer('Kalkulyatorni och.', 'kalkulyatorni och')).toBe(0);
    expect(wer('Eslatmalarimni ko‘rsat.', "eslatmalarimni ko'rsat")).toBe(0);
    expect(wer('O‘zbekiston', 'Oʻzbekiston')).toBe(0);
  });

  it('almashtirish, tushib qolish va ortiqcha so‘z hisoblanadi', () => {
    expect(wer('chrome brauzerini och', 'krom brauzerini och')).toBeCloseTo(1 / 3);
    expect(wer('chrome brauzerini och', 'brauzerini och')).toBeCloseTo(1 / 3);
    expect(wer('chrome brauzerini och', 'chrome brauzerini tez och')).toBeCloseTo(1 / 3);
  });

  it('umumiy WER so‘zlar soni bo‘yicha tortiladi', () => {
    expect(
      aggregateWer([
        { reference: 'a b c d', hypothesis: 'a b c d' },
        { reference: 'e f', hypothesis: 'x f' },
      ]),
    ).toBeCloseTo(1 / 6);
  });

  it('normallashtirish', () => {
    expect(normalizeUz('Salom, MARIUS! Qalaysan?')).toEqual(['salom', 'marius', 'qalaysan']);
  });
});

describe('test to‘plami (prompt §8.5)', () => {
  it('kamida 40 ta gap, 6 toifa, takrorlanmas id', () => {
    expect(TEST_SENTENCES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(TEST_SENTENCES.map((s) => s.category)).size).toBe(6);
    expect(new Set(TEST_SENTENCES.map((s) => s.id)).size).toBe(TEST_SENTENCES.length);
  });
});
