import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { AuthUser, UserRole } from "@/types";
import { getJwtSecret } from "./secret";

const COOKIE_NAME = "neuramed_session";
const TOKEN_EXPIRY = "7d";

// ── Token ─────────────────────────────────────────────────────────────────────

export const roleOf = (u: { role?: string | null } | null | undefined): UserRole => (u?.role === "doctor" ? "doctor" : "patient");

export async function signToken(payload: { userId: string; role?: UserRole }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; role?: UserRole } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as { userId: string; role?: UserRole };
  } catch {
    return null;
  }
}

// ── Session cookie ─────────────────────────────────────────────────────────────

export async function createSession(userId: string, role: UserRole = "patient"): Promise<string> {
  const token = await signToken({ userId, role });
  // Store session in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<AuthUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true, doctorRef: true, specialty: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    phone: session.user.phone ?? undefined,
    role: roleOf(session.user),
    doctorRef: roleOf(session.user) === "doctor" ? (session.user.doctorRef || session.user.id) : undefined,
    specialty: session.user.specialty ?? undefined,
  };
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Faqat bemor uchun: shifokor hisobi bemorning shaxsiy bo'limlarini ishlata olmaydi. */
export async function requirePatient(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "patient") throw new ForbiddenError("Bu boʻlim faqat bemorlar uchun");
  return user;
}

/** Faqat shifokor uchun. */
export async function requireDoctor(): Promise<AuthUser & { doctorRef: string }> {
  const user = await requireAuth();
  if (user.role !== "doctor") throw new ForbiddenError("Bu boʻlim faqat shifokorlar uchun");
  return { ...user, doctorRef: user.doctorRef || user.id };
}

// ── Password ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Register / Login ──────────────────────────────────────────────────────────

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  specialty?: string;
  clinicName?: string;
  licenseNo?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new Error("Bu email allaqachon ro'yxatdan o'tgan");

  const passwordHash = await hashPassword(input.password);
  const role: UserRole = input.role === "doctor" ? "doctor" : "patient";
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role,
      ...(role === "doctor"
        ? { specialty: input.specialty, clinicName: input.clinicName, licenseNo: input.licenseNo, workDaysJson: "[1,2,3,4,5]", workHoursJson: "[9,17]" }
        : {}),
    },
  });

  const token = await createSession(user.id, role);
  return { user, token };
}

export async function loginUser(input: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user || !user.passwordHash) {
    throw new Error("Email yoki parol noto'g'ri");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw new Error("Email yoki parol noto'g'ri");

  const token = await createSession(user.id, roleOf(user));
  return { user, token };
}

export async function logoutUser(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}
