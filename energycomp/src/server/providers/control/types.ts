// Smart Control adapter interfeysi. MVPda faqat simulyatsiya adapteri bor.
// Real adapter faqat: alohida ruxsat, inson tasdig'i, uskunaga mos xavfsizlik interloklari
// va integrator tekshiruvidan keyin qo'shiladi (docs/INTEGRATIONS.md).

export interface ControlCommand {
  equipmentId: string;
  action: 'STOP' | 'START';
  requestId: string;
}

export interface ControlResult {
  ok: boolean;
  simulated: boolean;
  message: string;
}

export interface ControlAdapter {
  readonly id: string;
  readonly isReal: boolean;
  execute(command: ControlCommand): Promise<ControlResult>;
}
