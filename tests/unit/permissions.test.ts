import { describe, expect, it } from 'vitest';
import { isPermissionAllowed } from '../../src/main/security/permissions';

const trusted = (url: string) => url.startsWith('file:///app/');
const APP = 'file:///app/index.html';

describe('ruxsat siyosati', () => {
  it('ilova sahifasiga faqat mikrofon (audio) ruxsat beriladi', () => {
    expect(isPermissionAllowed({ permission: 'media', url: APP, mediaTypes: ['audio'] }, trusted)).toBe(true);
    expect(isPermissionAllowed({ permission: 'media', url: APP, mediaType: 'audio' }, trusted)).toBe(true);
  });

  it('kamera rad etiladi', () => {
    expect(isPermissionAllowed({ permission: 'media', url: APP, mediaTypes: ['video'] }, trusted)).toBe(
      false,
    );
    expect(
      isPermissionAllowed({ permission: 'media', url: APP, mediaTypes: ['audio', 'video'] }, trusted),
    ).toBe(false);
    expect(isPermissionAllowed({ permission: 'media', url: APP, mediaType: 'video' }, trusted)).toBe(false);
    expect(isPermissionAllowed({ permission: 'media', url: APP, mediaTypes: [] }, trusted)).toBe(false);
  });

  it('begona sahifaga mikrofon berilmaydi', () => {
    expect(
      isPermissionAllowed(
        { permission: 'media', url: 'https://evil.example', mediaTypes: ['audio'] },
        trusted,
      ),
    ).toBe(false);
  });

  it('boshqa ruxsatlar rad etiladi', () => {
    for (const permission of [
      'geolocation',
      'notifications',
      'clipboard-read',
      'display-capture',
      'openExternal',
    ]) {
      expect(isPermissionAllowed({ permission, url: APP }, trusted)).toBe(false);
    }
  });
});
