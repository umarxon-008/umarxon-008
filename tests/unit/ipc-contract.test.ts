import { describe, expect, it } from 'vitest';
import { IPC, IPC_CHANNELS, SettingsPatchSchema, isIpcChannel } from '@shared/ipc';

describe('IPC shartnomasi', () => {
  it('faqat ro‘yxatdagi kanallarni taniydi', () => {
    expect(isIpcChannel('settings:getAll')).toBe(true);
    expect(isIpcChannel('fs:readFile')).toBe(false);
    expect(isIpcChannel('__proto__')).toBe(false);
    expect(isIpcChannel('toString')).toBe(false);
    expect(isIpcChannel(42)).toBe(false);
  });

  it('har bir kanalda input va output sxemasi bor', () => {
    for (const channel of IPC_CHANNELS) {
      expect(IPC[channel].input).toBeDefined();
      expect(IPC[channel].output).toBeDefined();
    }
  });

  it('sozlama patch: noma’lum kalitni rad etadi', () => {
    expect(SettingsPatchSchema.safeParse({ theme: 'dark' }).success).toBe(true);
    expect(SettingsPatchSchema.safeParse({ hacker: true }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ theme: 'neon' }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ reducedMotion: 'yes' }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse(null).success).toBe(false);
  });
});
