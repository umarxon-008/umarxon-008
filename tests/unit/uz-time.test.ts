import { describe, expect, it } from 'vitest';
import { formatUzDateTime, parseUzbekDateTime, wordToNumber } from '../../src/shared/uz-time';

// 2026-11-13, juma, 14:20 (mahalliy vaqt)
const NOW = new Date(2026, 10, 13, 14, 20, 0);
const at = (text: string) => {
  const r = parseUzbekDateTime(text, NOW);
  return r ? { when: formatUzDateTime(r.date, NOW), assumed: r.assumed } : null;
};

describe('o‘zbekcha sonlar', () => {
  it('so‘z va raqamlar', () => {
    expect(wordToNumber('yetti')).toBe(7);
    expect(wordToNumber("o'n ikki")).toBe(12);
    expect(wordToNumber('o‘n bir')).toBe(11);
    expect(wordToNumber('yigirma besh')).toBe(25);
    expect(wordToNumber('19')).toBe(19);
  });
});

describe('vaqt ifodalari (prompt §2, §15)', () => {
  it.each([
    ['Bugun soat 19:00 da vazifamni eslat', 'Bugun, 19:00'],
    ['soat 19.30', 'Bugun, 19:30'],
    ['ertaga soat 8:00', 'Ertaga, 08:00'],
    ['ertaga ertalab soat yettida', 'Ertaga, 07:00'],
    ['kechqurun soat yettida', 'Bugun, 19:00'],
    ['bugun kechqurun 8 da', 'Bugun, 20:00'],
    ['tushdan keyin soat 3 da', 'Bugun, 15:00'],
    ['indinga soat 10:15', '15-noyabr, yakshanba, 10:15'],
    ['30 daqiqadan keyin', 'Bugun, 14:50'],
    ['ikki soatdan keyin', 'Bugun, 16:20'],
    ['yarim soatdan keyin', 'Bugun, 14:50'],
    ['15-dekabr soat 18:30', '15-dekabr, seshanba, 18:30'],
    ['2026-12-31 23:59', '31-dekabr, payshanba, 23:59'],
    ['dushanba soat 9:00', '16-noyabr, dushanba, 09:00'],
    ['soat sakkiz yarimda ertaga', 'Ertaga, 08:30'],
  ])('“%s” → %s', (text, expected) => {
    expect(at(text)?.when).toBe(expected);
  });

  it('faqat kun aytilsa soat taxmin qilinadi va bu belgilanadi', () => {
    expect(at('ertaga darsga tayyorlanish')).toEqual({
      when: 'Ertaga, 09:00',
      assumed: ['soat 09:00 (vaqt aytilmagan)'],
    });
    expect(at('ertaga ertalab darsga tayyorlanishimni eslat')).toEqual({
      when: 'Ertaga, 08:00',
      assumed: ['soat 08:00 (ertalab)'],
    });
  });

  it('“soat 7” noaniq: eng yaqin kelajakdagi vaqt va taxmin belgisi', () => {
    const r = at('soat 7 da');
    expect(r?.when).toBe('Bugun, 19:00');
    expect(r?.assumed).toContain('kechki vaqt');
  });

  it('bugungi vaqt o‘tib ketgan bo‘lsa ertaga, taxmin belgisi bilan', () => {
    const r = at('soat 10:00');
    expect(r?.when).toBe('Ertaga, 10:00');
    expect(r?.assumed[0]).toMatch(/ertaga/);
  });

  it('vaqt ma’lumoti bo‘lmasa null (taxmin qilinmaydi)', () => {
    expect(parseUzbekDateTime('vazifamni eslat', NOW)).toBeNull();
    expect(parseUzbekDateTime('', NOW)).toBeNull();
  });
});
