import { execFile } from 'node:child_process';
import { AppError } from '../ipc/router';

/**
 * Qotirilgan PowerShell skriptini bajaradi. Skript matni faqat shu loyihadagi konstantalardan tuziladi,
 * tashqi qiymatlar (masalan, PID) faqat tekshirilgan butun son sifatida qo'shiladi.
 * Natija UTF-8 (o'zbek/rus harflari buzilmasligi uchun) va JSON.
 */
export function runPowerShell(script: string, timeoutMs = 10_000): Promise<string> {
  const full = `$ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${script}`;
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', full],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            Object.assign(new AppError('OS_COMMAND_FAILED'), {
              detail: String(stderr || error.message).slice(0, 500),
            }),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

/** PowerShell ConvertTo-Json bitta element uchun obyekt, ko'p element uchun massiv qaytaradi; bo'sh natija "" */
export function parseJsonList<T>(stdout: string): T[] {
  const text = stdout.trim().replace(/^\uFEFF/, ''); // UTF-8 BOM olib tashlanadi
  if (!text) return [];
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as T[];
  return parsed && typeof parsed === 'object' ? [parsed as T] : [];
}
