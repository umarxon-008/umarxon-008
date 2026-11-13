import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { finishOnboarding, launchApp } from './helpers';
import { MOCK_GEMINI_KEY, MOCK_TRANSCRIPT, startMockAiServer, type MockAiServer } from './mock-ai-server';

/**
 * PHASE 3 E2E: ovoz. Chromium'ning sinov mikrofoni (`--use-fake-device-for-media-stream`) haqiqiy
 * audio oqim beradi (vaqti-vaqti bilan "bip" ovozi). Ilova uni yozadi, WAV'ga aylantiradi va soxta Gemini'ga yuboradi.
 */
const FAKE_MIC = ['--use-fake-device-for-media-stream'];

let dataDir: string;
let mock: MockAiServer;

test.beforeEach(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'marius-voice-'));
  mock = await startMockAiServer();
});

test.afterEach(async () => {
  await mock.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test('rozilik berilmagan bo‘lsa ovoz hech qayerga yuborilmaydi', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_GEMINI_BASE_URL: mock.url }, FAKE_MIC);
  try {
    await finishOnboarding(page);
    await page.getByRole('button', { name: 'Mikrofonni yoqish' }).click();
    await expect(page.getByText('“TINGLAYAPMAN…”')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Tinglashni tugatish' }).click();
    await expect(page.getByText(/yuborilishiga rozilik bering/)).toBeVisible();
    expect(mock.requests.filter((r) => r.path.includes(':generateContent'))).toHaveLength(0);

    // To'g'ridan-to'g'ri IPC chaqiruvi ham rad etiladi (himoya main process'da)
    const direct = await page.evaluate(() => window.marius.voice.transcribe('UklGRgAAAABXQVZF'.repeat(10)));
    expect(direct).toMatchObject({ ok: false, error: { code: 'VOICE_CONSENT_REQUIRED' } });
  } finally {
    await app.close();
  }
});

test('to‘liq ovoz zanjiri: gapirish → matn → tahrir → javob → ovozli javob', async () => {
  const { app, page } = await launchApp(dataDir, { MARIUS_GEMINI_BASE_URL: mock.url }, FAKE_MIC);
  try {
    await finishOnboarding(page);
    const ai = await page.evaluate(() => window.marius.ai.getSettings());
    const encryptionAvailable = ai.ok && ai.data.secretStorageAvailable;
    if (process.platform === 'win32') expect(encryptionAvailable).toBe(true);

    if (!encryptionAvailable) {
      // Kalitni xavfsiz saqlab bo'lmaydigan tizimda (Linux konteyner): rozilik bo'lsa ham kalitsiz yuborilmaydi
      await page.evaluate(() => window.marius.settings.update({ sttCloudConsent: true }));
      const r = await page.evaluate(() => window.marius.voice.transcribe('UklGRgAAAABXQVZF'.repeat(10)));
      expect(r).toMatchObject({ ok: false, error: { code: 'VOICE_NOT_CONFIGURED' } });
      return;
    }

    // Sozlash: Gemini kaliti + chat modeli + Gemini ovozi + rozilik
    await page.evaluate(async (key) => {
      await window.marius.ai.setGeminiKey(key);
      await window.marius.ai.updateSettings({ provider: 'gemini', geminiModel: 'mock-gemini' });
      await window.marius.settings.update({
        sttProvider: 'gemini',
        sttCloudConsent: true,
        ttsEngine: 'gemini',
        ttsGeminiModel: 'mock-gemini-tts',
        speakVoiceReplies: true,
      });
    }, MOCK_GEMINI_KEY);
    await page.reload();

    await page.getByRole('button', { name: 'Mikrofonni yoqish' }).click();
    await expect(page.getByText('“TINGLAYAPMAN…”')).toBeVisible();
    await page.waitForTimeout(2500); // sinov mikrofoni "bip" beradi
    await page.getByRole('button', { name: 'Tinglashni tugatish' }).click();

    // Transkript tahrirlash uchun ko'rsatiladi
    const transcript = page.getByLabel('Matnni tekshiring');
    await expect(transcript).toHaveValue(MOCK_TRANSCRIPT);
    expect(mock.lastAudio?.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(mock.lastAudio?.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(mock.lastAudio!.readUInt32LE(24)).toBe(16000);

    await transcript.fill(`${MOCK_TRANSCRIPT} Bugun nima qilamiz?`);
    await page.getByRole('region', { name: 'Mikrofon' }).getByRole('button', { name: 'Yuborish' }).click();

    // Javob keladi va ovozli javob boshlanadi
    await expect(page.getByText('GAPIRYAPMAN…').first()).toBeVisible({ timeout: 15_000 });
    const chatReq = mock.requests.find((r) => r.path.includes(':streamGenerateContent'))!;
    const contents = (chatReq.body as { contents: { parts: { text: string }[] }[] }).contents;
    expect(contents.at(-1)!.parts[0]!.text).toBe(`${MOCK_TRANSCRIPT} Bugun nima qilamiz?`);
    expect(
      mock.requests.some((r) =>
        (
          r.body as { generationConfig?: { responseModalities?: string[] } }
        )?.generationConfig?.responseModalities?.includes('AUDIO'),
      ),
    ).toBe(true);

    await page.getByRole('button', { name: 'Ovozni to‘xtatish' }).click();
    await expect(page.getByRole('button', { name: 'Mikrofonni yoqish' })).toBeVisible();
  } finally {
    await app.close();
  }
});

test('Sozlamalar → Ovoz: rozilik belgisi va tizim ovozi sozlamalari saqlanadi', async () => {
  const { app, page } = await launchApp(dataDir);
  try {
    await finishOnboarding(page);
    await page
      .getByRole('navigation', { name: 'Asosiy navigatsiya' })
      .getByRole('link', { name: 'Sozlamalar' })
      .click();
    const consent = page.getByRole('checkbox', { name: /Google’ga yuborilishiga roziman/ });
    await expect(consent).not.toBeChecked();
    await page.getByText('Ovozim matnga aylantirish uchun Google’ga yuborilishiga roziman').click();
    await expect(consent).toBeChecked();
    await page.getByRole('radio', { name: /Windows ovozi/ }).click();
    const slider = page.getByRole('slider');
    await slider.focus();
    for (let i = 0; i < 4; i++) await slider.press('ArrowRight');
    await expect(page.getByText('Tezlik: 1.4×')).toBeVisible();
    const s = await page.evaluate(() => window.marius.settings.getAll());
    expect(s).toMatchObject({ ok: true, data: { sttCloudConsent: true, ttsEngine: 'system', ttsRate: 1.4 } });
  } finally {
    await app.close();
  }
});
