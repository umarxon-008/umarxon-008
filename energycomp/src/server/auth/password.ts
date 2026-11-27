import 'server-only';
import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Foydalanuvchi mavjud bo'lmaganda ham taqqoslash vaqtini bir xil qilish uchun (timing attack).
let dummyHash: Promise<string> | null = null;
export async function dummyVerify(): Promise<void> {
  dummyHash ??= bcrypt.hash('dummy-password', ROUNDS);
  await bcrypt.compare('not-the-password', await dummyHash);
}
