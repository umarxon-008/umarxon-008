import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { AppError, conflict, notFound, unauthorized, validationError } from '../errors';
import { dummyVerify, hashPassword, verifyPassword } from '../auth/password';
import { createSession, destroyCurrentSession, requestMeta } from '../auth/session';
import { generateToken, sha256 } from '../auth/tokens';
import { serverEnv } from '../env';
import { createOrganizationWithOwner } from './organization';
import type { LoginInput, RegisterInput } from '@/schemas/auth';

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Bu email bilan foydalanuvchi allaqachon ro'yxatdan o'tgan");
  const passwordHash = await hashPassword(input.password);
  const { user, org } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: input.email, name: input.name, passwordHash } });
    const { org } = await createOrganizationWithOwner(tx, {
      name: input.organizationName,
      industry: input.industry,
      ownerId: user.id,
    });
    return { user, org };
  });
  const meta = await requestMeta();
  await writeAudit({ organizationId: org.id, actorId: user.id, action: 'auth.registered', entityType: 'User', entityId: user.id, ip: meta.ip });
  await createSession(user.id, { remember: false, organizationId: org.id });
  return { userId: user.id, organizationId: org.id };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    await dummyVerify();
    throw unauthorized("Email yoki parol noto'g'ri");
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  const meta = await requestMeta();
  if (!valid) {
    await writeAudit({ actorId: user.id, action: 'auth.login_failed', entityType: 'User', entityId: user.id, ip: meta.ip });
    throw unauthorized("Email yoki parol noto'g'ri");
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id, { remember: input.remember });
  await writeAudit({ actorId: user.id, action: 'auth.login', entityType: 'User', entityId: user.id, ip: meta.ip });
  return { mustChangePassword: user.mustChangePassword };
}

export async function logoutUser() {
  await destroyCurrentSession();
}

const RESET_TTL_MS = 60 * 60_000;

/**
 * Parolni tiklash so'rovi. Email xizmati ulanmagan: development rejimida havola qaytariladi (sahifada ko'rsatiladi),
 * production'da havola qaytarilmaydi. Email mavjudligi oshkor qilinmaydi.
 */
export async function requestPasswordReset(email: string): Promise<{ devResetUrl: string | null }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { devResetUrl: null };
  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  await writeAudit({ actorId: user.id, action: 'auth.reset_requested', entityType: 'User', entityId: user.id });
  const url = `${serverEnv.appUrl}/reset-password?token=${token}`;
  if (!serverEnv.isProduction) {
    console.info(`[dev] Parolni tiklash havolasi (${email}): ${url}`);
    return { devResetUrl: url };
  }
  return { devResetUrl: null };
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('BAD_REQUEST', "Havola yaroqsiz yoki muddati o'tgan. Qaytadan so'rov yuboring.");
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Barcha eski sessiyalarni bekor qilamiz
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await writeAudit({ actorId: record.userId, action: 'auth.password_reset', entityType: 'User', entityId: record.userId });
}

export async function changePassword(userId: string, sessionId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound();
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw validationError("Joriy parol noto'g'ri", { currentPassword: "Joriy parol noto'g'ri" });
  }
  const passwordHash = await hashPassword(next);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } }),
    prisma.session.deleteMany({ where: { userId, id: { not: sessionId } } }),
  ]);
  await writeAudit({ actorId: userId, action: 'auth.password_changed', entityType: 'User', entityId: userId });
}

export async function updateProfile(userId: string, name: string) {
  return prisma.user.update({ where: { id: userId }, data: { name }, select: { id: true, name: true } });
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, lastSeenAt: true, userAgent: true, ip: true, expiresAt: true },
    orderBy: { lastSeenAt: 'desc' },
  });
}

export async function revokeOtherSessions(userId: string, sessionId: string) {
  const res = await prisma.session.deleteMany({ where: { userId, id: { not: sessionId } } });
  await writeAudit({ actorId: userId, action: 'auth.sessions_revoked', entityType: 'User', entityId: userId, metadata: { count: res.count } });
  return res.count;
}
