/**
 * MEDAI chat API.
 *  GET  /api/assistant          — suhbatlar ro'yxati
 *  POST /api/assistant          — { threadId?, message } -> javob (OpenAI yoki qoidaga asoslangan demo)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { chatAssistant, isAIEnabled } from "@/lib/ai";
import { demoReply, assessMessage, libraryMeta } from "@/lib/medai";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { getLocale, getT } from "@/i18n/server";

const MAX_CHARS = 4000;
const AI_SOURCE_NOTE = "Javob AI modelining umumiy bilimiga asoslangan. Ishonchli hujjatlar bazasi ulanmagan — rasmiy manba bilan tasdiqlanmagan.";

const titleFrom = (t: string) => {
  const c = t.replace(/\s+/g, " ").trim().replace(/[?.!]+$/, "");
  return c.length > 48 ? `${c.slice(0, 48).replace(/\s+\S*$/, "")}…` : c || "Yangi suhbat";
};

export async function GET() {
  try {
    const user = await requireAuth();
    const threads = await prisma.assistantThread.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({
      data: threads.map((t: any) => {
        const msgs = JSON.parse(t.messagesJson || "[]");
        return { id: t.id, title: t.title, updatedAt: t.updatedAt, count: msgs.length, last: msgs[msgs.length - 1]?.content?.slice(0, 120) || "" };
      }),
      aiEnabled: isAIEnabled(),
    });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await readJson(req);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) throw new HttpError(400, "Xabar boʻsh boʻlmasligi kerak");
    if (message.length > MAX_CHARS) throw new HttpError(400, (await getT())("Xabar {n} belgidan oshmasligi kerak", { n: MAX_CHARS }));

    let thread: any = null;
    if (body?.threadId) {
      thread = await prisma.assistantThread.findFirst({ where: { id: String(body.threadId), userId: user.id } });
      if (!thread) throw new HttpError(404, "Suhbat topilmadi");
    }
    const messages: any[] = thread ? JSON.parse(thread.messagesJson || "[]") : [];
    const now = new Date().toISOString();
    messages.push({ role: "user", content: message, createdAt: now });

    const flags = assessMessage(message);
    let reply: any;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    const aiText = isAIEnabled() ? await chatAssistant(history, getLocale()) : null;
    if (aiText) {
      reply = { role: "assistant", content: aiText, mode: "ai", sources: [], sourceNote: AI_SOURCE_NOTE, flags, createdAt: new Date().toISOString() };
    } else {
      const r = demoReply(message);
      reply = {
        role: "assistant", content: r.reply, mode: "demo", kind: r.kind, sources: r.sources, sourceNote: r.sourceNote, flags: r.flags,
        dataDate: r.sources.length ? libraryMeta.updatedAt : null, aiFailed: isAIEnabled(), createdAt: new Date().toISOString(),
      };
    }
    messages.push(reply);

    const data = { messagesJson: JSON.stringify(messages.slice(-200)) };
    thread = thread
      ? await prisma.assistantThread.update({ where: { id: thread.id }, data })
      : await prisma.assistantThread.create({ data: { ...data, userId: user.id, title: titleFrom(message) } });

    return NextResponse.json({ threadId: thread.id, title: thread.title, message: reply });
  } catch (e) { return apiError(e); }
}
