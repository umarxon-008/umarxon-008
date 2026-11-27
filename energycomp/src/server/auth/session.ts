import 'server-only';
import { cookies, headers } from 'next/headers';
import { prisma } from '../db';
import { generateToken, sha256 } from './tokens';

export const SESSION_COOKIE = 'ec_session';
const SESSION_DAYS_REMEMBER = 30;
const SESSION_HOURS_DEFAULT = 12;
const TOUCH_INTERVAL_MS = 5 * 60_000;

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return {
    ip: (fwd ? fwd.split(',')[0]?.trim() : h.get('x-real-ip')) ?? null,
    userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  };
}

export async function createSession(userId: string, opts: { remember: boolean; organizationId?: string | null }) {
  const token = generateToken();
  const ttl = opts.remember ? SESSION_DAYS_REMEMBER * 86_400_000 : SESSION_HOURS_DEFAULT * 3_600_000;
  const expiresAt = new Date(Date.now() + ttl);
  const meta = await requestMeta();
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt,
      activeOrganizationId: opts.organizationId ?? null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // "Meni eslab qolish" o'chiq bo'lsa — brauzer yopilganda o'chadigan cookie
    ...(opts.remember ? { expires: expiresAt } : {}),
  });
}

export async function readSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function loadSession() {
  const token = await readSessionToken();
  if (!token) return null;
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, name: true, isPlatformAdmin: true, mustChangePassword: true },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return session;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setActiveOrganization(sessionId: string, organizationId: string): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { activeOrganizationId: organizationId } });
}
