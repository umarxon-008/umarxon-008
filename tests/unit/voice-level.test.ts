import { describe, expect, it } from 'vitest';
import { rms, rmsToLevel, smoothLevel } from '../../src/renderer/src/features/voice/level';

describe('ovoz darajasi', () => {
  it('RMS: jimlik 0, doimiy signal o‘ziga teng', () => {
    expect(rms([])).toBe(0);
    expect(rms([0, 0, 0])).toBe(0);
    expect(rms([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5);
  });

  it('dB shkalasi: juda past ovoz 0, baland ovoz 1, o‘rtasi oraliqda', () => {
    expect(rmsToLevel(0)).toBe(0);
    expect(rmsToLevel(0.0001)).toBe(0); // -80 dB
    expect(rmsToLevel(1)).toBe(1); // 0 dB
    const mid = rmsToLevel(0.03); // ~ -30 dB
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.8);
  });

  it('silliqlash: tez ko‘tariladi, sekin tushadi', () => {
    const up = smoothLevel(0, 1);
    const down = smoothLevel(1, 0);
    expect(up).toBeGreaterThan(1 - down); // attack > release
    expect(up).toBeGreaterThan(0);
    expect(down).toBeLessThan(1);
  });
});
