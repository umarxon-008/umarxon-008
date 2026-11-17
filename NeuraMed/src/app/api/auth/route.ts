import { NextRequest, NextResponse } from "next/server";
import {
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { z } from "zod";
import { cookies } from "next/headers";
import { ensureDemoData } from "@/lib/demo-seed";
import { roleOf } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 ta belgi bo'lishi kerak"),
  email: z.string().email("Noto'g'ri email format"),
  password: z.string().min(8, "Parol kamida 8 ta belgi bo'lishi kerak"),
  phone: z.string().optional(),
  role: z.enum(["patient", "doctor"]).default("patient"),
  specialty: z.string().trim().max(60).optional(),
  clinicName: z.string().trim().max(120).optional(),
  licenseNo: z.string().trim().max(40).optional(),
}).superRefine((d, ctx) => {
  if (d.role !== "doctor") return;
  if (!d.specialty || d.specialty.length < 2) ctx.addIssue({ code: "custom", path: ["specialty"], message: "Mutaxassislikni kiriting" });
  if (!d.clinicName || d.clinicName.length < 2) ctx.addIssue({ code: "custom", path: ["clinicName"], message: "Ish joyini kiriting" });
  if (!d.licenseNo || d.licenseNo.length < 3) ctx.addIssue({ code: "custom", path: ["licenseNo"], message: "Litsenziya raqamini kiriting" });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// GET /api/auth — current session
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

// POST /api/auth?action=register | login | logout
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "register") {
      const body = await req.json();
      const data = registerSchema.parse(body);
      const { user, token } = await registerUser(data);
      setSessionCookie(token);
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: roleOf(user) },
      });
    }

    if (action === "login") {
      const body = await req.json();
      const data = loginSchema.parse(body);
      await ensureDemoData().catch(() => {});
      const { user, token } = await loginUser(data);
      setSessionCookie(token);
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email, role: roleOf(user) },
      });
    }

    if (action === "logout") {
      const token = cookies().get("neuramed_session")?.value;
      if (token) await logoutUser(token);
      clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0].message },
        { status: 422 }
      );
    }
    const message = err instanceof Error ? err.message : "Xatolik yuz berdi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
