import type { AppEntry, MediaAction, ProcessEntry, WindowEntry } from '@shared/ipc';

/**
 * Operatsion tizim adapteri (ARCHITECTURE §3, 5-qatlam).
 * Bu yerda faqat oldindan yozilgan, parametrlari qat'iy tekshiriladigan amallar bor.
 * AI hech qachon shell buyrug'ini o'zi yarata olmaydi.
 */
export interface OsAdapter {
  readonly kind: 'windows' | 'fake' | 'unsupported';
  readonly supported: boolean;
  /** Start menyusidagi dasturlar (Windows: Get-StartApps) */
  listApps(): Promise<AppEntry[]>;
  /** Faqat listApps() qaytargan dasturni ochadi */
  launchApp(app: AppEntry): Promise<void>;
  /** Ko'rinadigan oynalari bor jarayonlar */
  listWindows(): Promise<WindowEntry[]>;
  focusWindow(pid: number): Promise<boolean>;
  battery(): Promise<{ percent: number; charging: boolean } | null>;
  /** Barcha jarayonlar: xotira va 1 soniyalik CPU o'lchovi bilan (taxminan 1.5 soniya oladi) */
  listProcesses(): Promise<ProcessEntry[]>;
  /** Jarayonlarni yopish: force=false — oynasini yopish so'rovi (X tugmasi kabi), true — majburan */
  closeProcesses(pids: number[], force: boolean): Promise<void>;
  /** Berilganlardan hali ishlayotgan PID'lar (yopilganini tekshirish uchun) */
  runningPids(pids: number[]): Promise<number[]>;
  /** Faqat allowlist'dagi media/ovoz tugmasini `steps` marta bosadi (1–10) */
  sendMediaKey(action: MediaAction, steps: number): Promise<void>;
}
