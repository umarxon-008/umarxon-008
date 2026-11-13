import { pathToFileURL } from 'node:url';
import {
  ErrorCodes,
  IPC,
  isIpcChannel,
  type ErrorCode,
  type IpcChannel,
  type IpcInput,
  type IpcOutput,
  type IpcResult,
} from '@shared/ipc';
import type { Logger } from '../logging/logger';

export type IpcHandlers = {
  [C in IpcChannel]: (input: IpcInput<C>) => Promise<IpcOutput<C>> | IpcOutput<C>;
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? ErrorCodes[code]);
  }
}

function fail(code: ErrorCode): IpcResult<never> {
  return { ok: false, error: { code, message: ErrorCodes[code] } };
}

/**
 * Har bir IPC chaqiriq shu funksiyadan o'tadi:
 * 1) kanal allowlist'da bormi, 2) jo'natuvchi ishonchlimi,
 * 3) kirish ma'lumoti zod bilan tekshiriladi, 4) handler, 5) chiqish tekshiriladi.
 * Electron'ga bog'liq emas, shuning uchun unit testda sinaladi.
 */
export async function dispatchIpc(
  channel: unknown,
  rawInput: unknown,
  senderUrl: string,
  handlers: IpcHandlers,
  isTrustedSender: (url: string) => boolean,
  logger: Logger,
): Promise<IpcResult<unknown>> {
  if (!isIpcChannel(channel)) {
    logger.warn('ipc.unknown_channel', { channel: String(channel) });
    return fail('UNKNOWN_CHANNEL');
  }
  if (!isTrustedSender(senderUrl)) {
    logger.warn('ipc.forbidden_sender', { channel, senderUrl });
    return fail('FORBIDDEN_SENDER');
  }

  const contract = IPC[channel];
  const parsed = contract.input.safeParse(rawInput);
  if (!parsed.success) {
    logger.warn('ipc.invalid_input', { channel, issues: parsed.error.issues.map((i) => i.message) });
    return fail('INVALID_INPUT');
  }

  try {
    const handler = handlers[channel] as (input: unknown) => unknown;
    const output = await handler(parsed.data);
    const checked = contract.output.safeParse(output);
    if (!checked.success) {
      logger.error('ipc.invalid_output', { channel, issues: checked.error.issues.map((i) => i.message) });
      return fail('UNEXPECTED');
    }
    return { ok: true, data: checked.data };
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn('ipc.app_error', { channel, code: error.code });
      return fail(error.code);
    }
    logger.error('ipc.handler_failed', { channel, error });
    return fail('UNEXPECTED');
  }
}

/** Dev server yoki ilova ichidagi `file://` sahifasidan kelgan so'rovlargina qabul qilinadi. */
export function createSenderGuard(options: { devServerUrl?: string; rendererFile: string }) {
  const devOrigin = options.devServerUrl ? new URL(options.devServerUrl).origin : undefined;
  const fileUrl = pathToFileURL(options.rendererFile).href;

  return (url: string): boolean => {
    try {
      const parsed = new URL(url);
      if (devOrigin && parsed.origin === devOrigin) return true;
      if (parsed.protocol === 'file:') {
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}` === fileUrl;
      }
      return false;
    } catch {
      return false;
    }
  };
}
