import { execFile } from 'node:child_process';
import type { AppEntry, MediaAction, ProcessEntry, WindowEntry } from '@shared/ipc';
import type { OsAdapter } from './os-adapter';
import { parseJsonList, runPowerShell } from './powershell';

/** Get-StartApps: { Name, AppID } — Win32 va UWP (masalan, Kalkulyator) dasturlari */
export function parseStartApps(stdout: string): AppEntry[] {
  const seen = new Set<string>();
  const out: AppEntry[] = [];
  for (const a of parseJsonList<{ Name?: unknown; AppID?: unknown }>(stdout)) {
    if (typeof a.Name !== 'string' || typeof a.AppID !== 'string') continue;
    const name = a.Name.trim();
    const id = a.AppID.trim();
    if (!name || !id || seen.has(id) || !isSafeAppId(id)) continue;
    seen.add(id);
    out.push({ id, name });
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

/** AppID'da qo'shtirnoq, yangi qator va boshqa boshqaruv belgilari bo'lmasligi kerak */
export function isSafeAppId(id: string): boolean {
  return id.length <= 500 && !/["\r\n\0<>|]/.test(id);
}

export function parseWindows(stdout: string): WindowEntry[] {
  return parseJsonList<{ Id?: unknown; ProcessName?: unknown; MainWindowTitle?: unknown }>(stdout)
    .filter((w) => typeof w.Id === 'number' && typeof w.MainWindowTitle === 'string' && w.MainWindowTitle)
    .map((w) => ({
      pid: w.Id as number,
      app: String(w.ProcessName ?? ''),
      title: String(w.MainWindowTitle),
    }));
}

/** Oynani oldinga chiqarish skripti. PID faqat musbat butun son bo'lsa qo'shiladi. */
export function focusScript(pid: number): string {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('invalid pid');
  return [
    `$sig = '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int n); [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);';`,
    `Add-Type -MemberDefinition $sig -Name W -Namespace MariusWin;`,
    `$h = (Get-Process -Id ${pid}).MainWindowHandle;`,
    `if ($h -eq 0) { 'false' } else { if ([MariusWin.W]::IsIconic($h)) { [void][MariusWin.W]::ShowWindowAsync($h, 9) }; [MariusWin.W]::SetForegroundWindow($h) }`,
  ].join(' ');
}

/** Ikki o'lchov orasidagi CPU vaqti farqi → foiz (barcha yadrolarga nisbatan, Task Manager kabi) */
export const LIST_PROCESSES_SCRIPT = [
  '$c = [Environment]::ProcessorCount; $a = @{};',
  'foreach ($p in Get-Process) { $a[$p.Id] = $p.CPU };',
  '$sw = [Diagnostics.Stopwatch]::StartNew(); Start-Sleep -Milliseconds 1000; $s = $sw.Elapsed.TotalSeconds;',
  'Get-Process | ForEach-Object {',
  '  $cpu = $null;',
  '  if ($_.CPU -ne $null -and $a[$_.Id] -ne $null) { $cpu = [math]::Round((($_.CPU - $a[$_.Id]) / $s / $c) * 100, 1); if ($cpu -lt 0) { $cpu = 0 } };',
  '  [pscustomobject]@{ Id = $_.Id; Name = $_.ProcessName; Mem = $_.WorkingSet64; Cpu = $cpu; Session = $_.SessionId; Title = $_.MainWindowTitle }',
  '} | ConvertTo-Json -Compress',
].join(' ');

export function parseProcesses(stdout: string): ProcessEntry[] {
  return parseJsonList<{
    Id?: unknown;
    Name?: unknown;
    Mem?: unknown;
    Cpu?: unknown;
    Session?: unknown;
    Title?: unknown;
  }>(stdout)
    .filter((p) => typeof p.Id === 'number' && p.Id > 0 && typeof p.Name === 'string' && p.Name)
    .map((p) => ({
      pid: p.Id as number,
      name: String(p.Name),
      memoryBytes: typeof p.Mem === 'number' && p.Mem > 0 ? p.Mem : 0,
      cpuPercent: typeof p.Cpu === 'number' && p.Cpu >= 0 ? p.Cpu : null,
      sessionId: typeof p.Session === 'number' && p.Session >= 0 ? p.Session : 0,
      title: typeof p.Title === 'string' ? p.Title : '',
    }));
}

/** PID'lar faqat musbat butun son bo'lsa skriptga qo'shiladi */
function pidList(pids: number[]): string {
  if (pids.length === 0 || pids.length > 200) throw new Error('invalid pid list');
  for (const p of pids) if (!Number.isSafeInteger(p) || p <= 0) throw new Error('invalid pid');
  return pids.join(',');
}

export function closeScript(pids: number[], force: boolean): string {
  const ids = pidList(pids);
  return force
    ? `Stop-Process -Id ${ids} -Force -ErrorAction SilentlyContinue`
    : `foreach ($i in @(${ids})) { $p = Get-Process -Id $i -ErrorAction SilentlyContinue; if ($p -and $p.MainWindowHandle -ne 0) { [void]$p.CloseMainWindow() } }`;
}

export function runningPidsScript(pids: number[]): string {
  return `(@(Get-Process -Id ${pidList(pids)} -ErrorAction SilentlyContinue) | ForEach-Object { $_.Id }) -join ','`;
}

/**
 * Windows virtual-key kodlari (VK_VOLUME_MUTE=0xAD … VK_MEDIA_PLAY_PAUSE=0xB3).
 * WScript.Shell.SendKeys shu belgini tegishli media tugmasi sifatida yuboradi.
 * Faqat shu jadvaldagi kodlar ishlatiladi: AI ixtiyoriy tugma yoki matn yubora olmaydi.
 */
export const MEDIA_KEY_CODES: Record<MediaAction, number> = {
  mute: 173,
  volume_down: 174,
  volume_up: 175,
  next_track: 176,
  previous_track: 177,
  play_pause: 179,
};

export function mediaKeyScript(action: MediaAction, steps: number): string {
  const code = MEDIA_KEY_CODES[action];
  if (code === undefined) throw new Error('unknown media action');
  if (!Number.isInteger(steps) || steps < 1 || steps > 10) throw new Error('invalid steps');
  return `$w = New-Object -ComObject WScript.Shell; for ($i = 0; $i -lt ${steps}; $i++) { $w.SendKeys([string][char]${code}); Start-Sleep -Milliseconds 40 }`;
}

export function createWindowsAdapter(): OsAdapter {
  return {
    kind: 'windows',
    supported: true,

    async listApps() {
      return parseStartApps(
        await runPowerShell('Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress', 20_000),
      );
    },

    launchApp(app) {
      if (!isSafeAppId(app.id)) return Promise.reject(new Error('unsafe app id'));
      // Start menyusidagi dastur Explorer orqali ochiladi: tasodifiy .exe yo'li ishga tushirilmaydi
      return new Promise((resolve, reject) => {
        const child = execFile('explorer.exe', [`shell:AppsFolder\\${app.id}`], { windowsHide: true });
        child.once('error', reject);
        child.once('spawn', () => resolve()); // explorer.exe chiqish kodi ishonchsiz, shuning uchun natija alohida tekshiriladi
      });
    },

    async listWindows() {
      return parseWindows(
        await runPowerShell(
          'Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -Compress',
        ),
      );
    },

    async focusWindow(pid) {
      return (await runPowerShell(focusScript(pid))).trim().toLowerCase() === 'true';
    },

    async listProcesses() {
      return parseProcesses(await runPowerShell(LIST_PROCESSES_SCRIPT, 20_000));
    },

    async closeProcesses(pids, force) {
      await runPowerShell(closeScript(pids, force), 20_000);
    },

    async runningPids(pids) {
      const out = await runPowerShell(runningPidsScript(pids));
      return out
        .trim()
        .split(',')
        .map((x) => Number(x))
        .filter((n) => Number.isSafeInteger(n) && n > 0);
    },

    async sendMediaKey(action, steps) {
      await runPowerShell(mediaKeyScript(action, steps));
    },

    async battery() {
      const rows = parseJsonList<{ EstimatedChargeRemaining?: unknown; BatteryStatus?: unknown }>(
        await runPowerShell(
          'Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json -Compress',
        ),
      );
      const b = rows[0];
      if (!b || typeof b.EstimatedChargeRemaining !== 'number') return null;
      // BatteryStatus 2 = tok manbaiga ulangan (Win32_Battery hujjati)
      return { percent: b.EstimatedChargeRemaining, charging: b.BatteryStatus === 2 };
    },
  };
}
