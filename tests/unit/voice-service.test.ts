import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '@shared/ipc';
import {
  cleanTranscript,
  createGeminiAudio,
  TRANSCRIBE_INSTRUCTION,
} from '../../src/modules/ai/gemini-audio';
import { VoiceService } from '../../src/main/services/voice-service';
import { isUzbekVoice, speechText, splitSentences } from '../../src/renderer/src/features/voice/speechText';

const KEY = 'AIza-voice-key-123456';
const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function okText(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
}

describe('Gemini audio adapteri', () => {
  it('transkripsiya: generateContent ga inlineData (audio/wav) va ko‘rsatma yuboradi', async () => {
    const fetchMock = vi.fn(async () => okText('“Kalkulyatorni och.”'));
    const audio = createGeminiAudio({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    const text = await audio.transcribe('m1', 'QUJD', 'audio/wav');
    expect(text).toBe('Kalkulyatorni och.');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/m1:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const body = JSON.parse(String(init.body));
    expect(body.contents[0].parts[0].text).toBe(TRANSCRIBE_INSTRUCTION);
    expect(body.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'audio/wav', data: 'QUJD' } });
  });

  it('TTS: responseModalities AUDIO va inlineData javobi', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: 'AAAA' } }],
                },
              },
            ],
          }),
        ),
    );
    const audio = createGeminiAudio({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    expect(await audio.synthesize('tts-model', 'Salom')).toEqual({
      audio: 'AAAA',
      mimeType: 'audio/L16;codec=pcm;rate=24000',
    });
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.generationConfig.responseModalities).toEqual(['AUDIO']);
  });

  it('TTS javobida audio bo‘lmasa → AI_BAD_RESPONSE', async () => {
    const audio = createGeminiAudio({
      apiKey: async () => KEY,
      fetch: (async () => okText('matn')) as unknown as typeof fetch,
    });
    await expect(audio.synthesize('m', 'x')).rejects.toMatchObject({ code: 'AI_BAD_RESPONSE' });
  });

  it('noto‘g‘ri kalit → AI_AUTH_INVALID', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 400, details: [{ reason: 'API_KEY_INVALID' }] } }), {
          status: 400,
        }),
    );
    const audio = createGeminiAudio({ apiKey: async () => KEY, fetch: fetchMock as unknown as typeof fetch });
    await expect(audio.transcribe('m', 'QUJD', 'audio/wav')).rejects.toMatchObject({
      code: 'AI_AUTH_INVALID',
    });
  });

  it('transkriptni tozalash', () => {
    expect(cleanTranscript('"Salom"')).toBe('Salom');
    expect(cleanTranscript('[ovoz yo‘q]')).toBe('');
    expect(cleanTranscript('(no speech)')).toBe('');
    expect(cleanTranscript('  Ha  ')).toBe('Ha');
  });
});

describe('VoiceService: rozilik va sozlama qoidalari', () => {
  function make(settings: Partial<Settings>, opts: { key?: boolean; model?: string | null } = {}) {
    const transcribe = vi.fn(async () => 'matn');
    const synthesize = vi.fn(async () => ({ audio: 'AA', mimeType: 'audio/L16' }));
    const service = new VoiceService({
      settings: () => ({ ...DEFAULT_SETTINGS, ...settings }),
      audio: { transcribe, synthesize },
      geminiChatModel: () => (opts.model === undefined ? 'gemini-model' : opts.model),
      hasGeminiKey: () => opts.key ?? true,
      logger,
    });
    return { service, transcribe, synthesize };
  }

  it('rozilik bo‘lmasa audio YUBORILMAYDI', async () => {
    const { service, transcribe } = make({ sttProvider: 'gemini', sttCloudConsent: false });
    await expect(service.transcribe('QUJD', 'audio/wav')).rejects.toMatchObject({
      code: 'VOICE_CONSENT_REQUIRED',
    });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('STT o‘chiq bo‘lsa yuborilmaydi', async () => {
    const { service, transcribe } = make({ sttProvider: 'off', sttCloudConsent: true });
    await expect(service.transcribe('QUJD', 'audio/wav')).rejects.toMatchObject({ code: 'VOICE_DISABLED' });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('kalit yoki model yo‘q → VOICE_NOT_CONFIGURED', async () => {
    await expect(
      make({ sttCloudConsent: true }, { key: false }).service.transcribe('QUJD', 'audio/wav'),
    ).rejects.toMatchObject({ code: 'VOICE_NOT_CONFIGURED' });
    await expect(
      make({ sttCloudConsent: true }, { model: null }).service.transcribe('QUJD', 'audio/wav'),
    ).rejects.toMatchObject({ code: 'VOICE_NOT_CONFIGURED' });
  });

  it('rozilik bilan: chat modeli orqali transkripsiya, logga audio yozilmaydi', async () => {
    const { service, transcribe } = make({ sttProvider: 'gemini', sttCloudConsent: true });
    expect(await service.transcribe('QUJD', 'audio/wav')).toBe('matn');
    expect(transcribe).toHaveBeenCalledWith('gemini-model', 'QUJD', 'audio/wav');
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('QUJD');
  });

  it('TTS faqat Gemini ovozi tanlangan va model bor bo‘lsa', async () => {
    await expect(make({ ttsEngine: 'system' }).service.synthesize('x')).rejects.toMatchObject({
      code: 'TTS_NOT_CONFIGURED',
    });
    await expect(
      make({ ttsEngine: 'gemini', ttsGeminiModel: null }).service.synthesize('x'),
    ).rejects.toMatchObject({
      code: 'TTS_NOT_CONFIGURED',
    });
    const { service, synthesize } = make({ ttsEngine: 'gemini', ttsGeminiModel: 'tts-1' });
    await service.synthesize('Salom');
    expect(synthesize).toHaveBeenCalledWith('tts-1', 'Salom');
  });

  it('provayder xatosi o‘zbekcha IPC xatosiga aylanadi', async () => {
    const service = new VoiceService({
      settings: () => ({ ...DEFAULT_SETTINGS, sttCloudConsent: true }),
      audio: {
        transcribe: async () => {
          const { ProviderError } = await import('../../src/modules/ai/types');
          throw new ProviderError('AI_RATE_LIMITED');
        },
        synthesize: vi.fn(),
      },
      geminiChatModel: () => 'm',
      hasGeminiKey: () => true,
      logger,
    });
    await expect(service.transcribe('QUJD', 'audio/wav')).rejects.toMatchObject({
      code: 'AI_RATE_LIMITED',
      message: expect.stringMatching(/limit/),
    });
  });
});

describe('ovoz chiqarib o‘qish uchun matn', () => {
  it('Markdown va kod bloklarini olib tashlaydi', () => {
    expect(speechText('**Salom!** Mana:\n```js\nx()\n```\n`for` sikli')).toBe(
      'Salom! Mana: . Kod namunasi ekranda. for sikli',
    );
  });

  it('uzun matnni gaplar bo‘yicha bo‘ladi', () => {
    const parts = splitSentences('Birinchi gap. Ikkinchi gap! ' + 'Juda uzun so‘z '.repeat(40));
    expect(parts.every((p) => p.length <= 220)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toContain('Birinchi gap. Ikkinchi gap!');
  });

  it('o‘zbekcha ovozni aniqlaydi', () => {
    expect(isUzbekVoice({ lang: 'uz-UZ', name: 'X' })).toBe(true);
    expect(isUzbekVoice({ lang: 'en-US', name: 'Microsoft Madina (Uzbek)' })).toBe(true);
    expect(isUzbekVoice({ lang: 'ru-RU', name: 'Irina' })).toBe(false);
  });
});
