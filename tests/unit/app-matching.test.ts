import { describe, expect, it } from 'vitest';
import { matchApp, normalizeAppQuery, windowMatchesApp } from '../../src/main/tools/app-matching';
import {
  focusScript,
  isSafeAppId,
  parseStartApps,
  parseWindows,
} from '../../src/main/windows/windows-adapter';
import { parseJsonList } from '../../src/main/windows/powershell';

const apps = [
  { id: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App', name: 'Calculator' },
  { id: 'Chrome', name: 'Google Chrome' },
  { id: 'Edge', name: 'Microsoft Edge' },
  { id: 'Code', name: 'Visual Studio Code' },
  { id: 'VS', name: 'Visual Studio 2022' },
  { id: 'Tg', name: 'Telegram Desktop' },
];

describe('dastur nomini moslashtirish', () => {
  it('o‘zbekcha nom va qo‘shimchalar', () => {
    expect(normalizeAppQuery('Kalkulyatorni')).toBe('kalkulyator');
    expect(normalizeAppQuery('Chrome brauzerini')).toBe('chrome');
    expect(matchApp('kalkulyatorni', apps)).toEqual({ kind: 'exact', app: apps[0] });
    expect(matchApp('Chrome brauzerini', apps)).toMatchObject({
      kind: 'exact',
      app: { name: 'Google Chrome' },
    });
    expect(matchApp('telegram', apps)).toMatchObject({ kind: 'exact', app: { name: 'Telegram Desktop' } });
  });

  it('bir nechta mos dastur → tanlash uchun ro‘yxat', () => {
    const m = matchApp('Visual Studio', apps);
    expect(m.kind).toBe('ambiguous');
    expect(m.kind === 'ambiguous' && m.candidates.map((a) => a.name)).toEqual([
      'Visual Studio Code',
      'Visual Studio 2022',
    ]);
    expect(matchApp('brauzer', apps).kind).toBe('ambiguous');
  });

  it('aniq nom ustun turadi', () => {
    expect(matchApp('Visual Studio Code', apps)).toMatchObject({ kind: 'exact', app: { id: 'Code' } });
  });

  it('topilmasa → not_found (tasodifiy dastur ochilmaydi)', () => {
    expect(matchApp('photoshop', apps).kind).toBe('not_found');
    expect(matchApp('', apps).kind).toBe('not_found');
  });

  it('ochilgan oyna dasturga mosligi', () => {
    expect(windowMatchesApp({ app: 'CalculatorApp', title: 'Calculator' }, apps[0]!)).toBe(true);
    expect(windowMatchesApp({ app: 'chrome', title: 'New Tab - Google Chrome' }, apps[1]!)).toBe(true);
    expect(windowMatchesApp({ app: 'notepad', title: 'Untitled' }, apps[0]!)).toBe(false);
  });
});

describe('Windows adapter parserlari', () => {
  it('PowerShell JSON: bitta obyekt yoki massiv, bo‘sh natija', () => {
    expect(parseJsonList('{"a":1}')).toEqual([{ a: 1 }]);
    expect(parseJsonList('[{"a":1},{"a":2}]')).toHaveLength(2);
    expect(parseJsonList('  ')).toEqual([]);
    expect(parseJsonList('\uFEFF[]')).toEqual([]);
  });

  it('Get-StartApps: dublikatlar va xavfli AppID olib tashlanadi, o‘zbek/rus nomlari saqlanadi', () => {
    const out = parseStartApps(
      JSON.stringify([
        { Name: 'Калькулятор', AppID: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App' },
        { Name: 'Калькулятор', AppID: 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App' },
        { Name: 'Evil', AppID: 'x" & calc.exe & "' },
        { Name: 'Bo‘sh', AppID: '' },
        { Name: 'Google Chrome', AppID: 'Chrome' },
      ]),
    );
    expect(out.map((a) => a.name)).toEqual(['Google Chrome', 'Калькулятор']);
  });

  it('xavfsiz AppID', () => {
    expect(isSafeAppId('Microsoft.WindowsCalculator_8wekyb3d8bbwe!App')).toBe(true);
    expect(isSafeAppId('{6D809377-6AF0-444B-8957-A3773F02200E}\\Notepad++\\notepad++.exe')).toBe(true);
    expect(isSafeAppId('a"b')).toBe(false);
    expect(isSafeAppId('a\nb')).toBe(false);
  });

  it('oynalar ro‘yxati', () => {
    expect(parseWindows('{"Id":12,"ProcessName":"chrome","MainWindowTitle":"YouTube"}')).toEqual([
      { pid: 12, app: 'chrome', title: 'YouTube' },
    ]);
  });

  it('focus skriptiga faqat musbat butun PID qo‘yiladi', () => {
    expect(focusScript(1234)).toContain('Get-Process -Id 1234');
    expect(() => focusScript(-1)).toThrow();
    expect(() => focusScript(1.5)).toThrow();
    expect(() => focusScript(Number('1; Remove-Item C:\\'))).toThrow();
  });
});
