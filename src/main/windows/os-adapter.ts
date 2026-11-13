import type { AppEntry, WindowEntry } from '@shared/ipc';

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
}
