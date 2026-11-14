import { describe, expect, it } from 'vitest';
import { parseQuickCommand } from '@shared/quick-commands';

describe('Tezkor buyruqlar', () => {
  it.each([
    ['Telegramni och', { kind: 'open_app', name: 'telegramni' }],
    ['kalkulyatorni och!', { kind: 'open_app', name: 'kalkulyatorni' }],
    ['Marius, iltimos chrome ni ochib ber', { kind: 'open_app', name: 'chrome ni' }],
    ['Visual Studio Code’ni ishga tushir', { kind: 'open_app', name: 'visual studio codeni' }],
    ['telegramni yop', { kind: 'close_app', name: 'telegramni' }],
    ['Chrome’ni o‘chir', { kind: 'close_app', name: 'chromeni' }],
    ['Ovozni pasaytir', { kind: 'media', action: 'volume_down' }],
    ['ovozni balandlat', { kind: 'media', action: 'volume_up' }],
    ['ovozni oshir', { kind: 'media', action: 'volume_up' }],
    ['Ovozni o‘chir', { kind: 'media', action: 'mute' }],
    ['pauza', { kind: 'media', action: 'play_pause' }],
    ['Keyingi qo‘shiq', { kind: 'media', action: 'next_track' }],
    ['oldingi trek', { kind: 'media', action: 'previous_track' }],
    ['Batareya necha foiz?', { kind: 'battery' }],
    ['diskda qancha joy bor?', { kind: 'disk' }],
  ])('%s', (text, intent) => {
    expect(parseQuickCommand(text)).toEqual(intent);
  });

  it.each([
    'Python’da massivni qanday ochish mumkin?',
    'menga eng yaxshi brauzerni tanlab, keyin uni yuklab olishni tushuntirib ber va och',
    'Salom',
    'Ertaga soat 8 da imtihonni eslat',
    'Internetda Python darslarini qidir',
    'keyingi',
  ])('AI’ga ketadi: %s', (text) => {
    expect(parseQuickCommand(text)).toBeNull();
  });
});
