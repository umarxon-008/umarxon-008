import { describe, expect, it } from 'vitest';
import { classifyGeminiModel, defaultGeminiModel, sortGeminiModels } from '@shared/gemini-models';

const API_LIST = [
  'gemini-2.5-pro',
  'gemini-2.5-flash-preview-tts',
  'gemma-3-27b-it',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-lite',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
];

describe('Gemini modellarini saralash', () => {
  it('turlar: flash tavsiya, pro oddiy, tts/rasm/gemma suhbat uchun emas', () => {
    expect(classifyGeminiModel('gemini-2.5-flash')).toBe('recommended');
    expect(classifyGeminiModel('gemini-2.5-pro')).toBe('chat');
    expect(classifyGeminiModel('gemini-2.5-flash-preview-tts')).toBe('other');
    expect(classifyGeminiModel('gemini-2.0-flash-exp-image-generation')).toBe('other');
    expect(classifyGeminiModel('gemma-3-27b-it')).toBe('other');
  });

  it('barqaror flash birinchi, lite undan keyin, preview oxirroqda', () => {
    const order = sortGeminiModels(API_LIST).map((m) => m.name);
    expect(order.slice(0, 6)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
      'gemini-2.5-pro',
      'gemini-3-pro-preview',
    ]);
    // Suhbat uchun bo'lmaganlar eng oxirida (ular ichidagi tartib muhim emas)
    expect(new Set(order.slice(6))).toEqual(
      new Set(['gemini-2.0-flash-exp-image-generation', 'gemini-2.5-flash-preview-tts', 'gemma-3-27b-it']),
    );
  });

  it('avtomatik tanlov: faqat tavsiya etilgan model', () => {
    expect(defaultGeminiModel(API_LIST)).toBe('gemini-2.5-flash');
    expect(defaultGeminiModel(['gemini-2.5-pro', 'gemma-3'])).toBeNull();
    expect(defaultGeminiModel([])).toBeNull();
  });
});
