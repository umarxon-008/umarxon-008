// Markazlashtirilgan xatolar. message — foydalanuvchiga ko'rsatiladigan o'zbekcha matn.
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'LIMIT_EXCEEDED'
  | 'FEATURE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  LIMIT_EXCEEDED: 402,
  FEATURE_UNAVAILABLE: 402,
  RATE_LIMITED: 429,
  BAD_REQUEST: 400,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const unauthorized = (m = 'Tizimga kiring') => new AppError('UNAUTHORIZED', m);
export const forbidden = (m = "Bu amal uchun ruxsatingiz yo'q") => new AppError('FORBIDDEN', m);
export const notFound = (m = 'Topilmadi') => new AppError('NOT_FOUND', m);
export const conflict = (m: string) => new AppError('CONFLICT', m);
export const badRequest = (m: string, d?: unknown) => new AppError('BAD_REQUEST', m, d);
export const validationError = (m: string, d?: unknown) => new AppError('VALIDATION', m, d);
export const limitExceeded = (m: string, d?: unknown) => new AppError('LIMIT_EXCEEDED', m, d);
export const featureUnavailable = (m: string) => new AppError('FEATURE_UNAVAILABLE', m);
export const rateLimited = (m = "Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring.") =>
  new AppError('RATE_LIMITED', m);
