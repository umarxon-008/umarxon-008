"use client";

import { useT, useLocale } from "@/i18n/client";
import * as React from "react";
import Link from "next/link";
import { Bot, Copy, MessageSquarePlus, Send, Trash2, BookOpen, ShieldAlert, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { api, DemoBadge, EmergencyBanner, Toast } from "@/components/modules/common";
import { Markdown } from "@/components/modules/markdown";

interface Source { title: string; org: string; url: string; term?: string }
interface Msg {
  role: "user" | "assistant"; content: string; mode?: "ai" | "demo"; sources?: Source[]; sourceNote?: string;
  flags?: { emergency: boolean; diagnosisRequest: boolean; doseRequest: boolean }; dataDate?: string | null; aiFailed?: boolean; createdAt?: string;
}
interface Thread { id: string; title: string; updatedAt: string; count: number; last: string }

const TRY = [
  { q: "Gemoglobinim 112 g/L, meʼyor 120–160. Bu nimani anglatadi?", label: "Gemoglobinim 112, meʼyor 120–160" },
  { q: "Tahlilga qanday tayyorlanish kerak?", label: "Tahlilga tayyorgarlik" },
  { q: "ALT nima va u nimani koʻrsatadi?", label: "ALT nima?" },
  { q: "Dorimning dozasini ikki baravar oshirsam boʻladimi?", label: "Dozani oshirsam boʻladimi?", safety: true },
];

export function AssistantClient({ aiEnabled }: { aiEnabled: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const loadThreads = React.useCallback(() => api<{ data: Thread[] }>("/api/assistant").then((r) => setThreads(r.data)).catch(() => {}), []);
  React.useEffect(() => { loadThreads(); }, [loadThreads]);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  const openThread = async (id: string) => {
    setShowHistory(false); setError(null);
    try {
      const r = await api<{ data: { id: string; messages: Msg[] } }>(`/api/assistant/${id}`);
      setThreadId(id); setMessages(r.data.messages);
    } catch (e: any) { setError(t(e.message)); }
  };

  const newChat = () => { setThreadId(null); setMessages([]); setError(null); setShowHistory(false); };

  const removeThread = async (id: string) => {
    if (!confirm(t("Bu suhbat oʻchirilsinmi?"))) return;
    await api(`/api/assistant/${id}`, { method: "DELETE" }).catch(() => {});
    if (id === threadId) newChat();
    loadThreads();
  };

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput(""); setError(null); setBusy(true);
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const r = await api<{ threadId: string; message: Msg }>("/api/assistant", { method: "POST", json: { threadId, message } });
      setThreadId(r.threadId);
      setMessages((m) => [...m, r.message]);
      loadThreads();
    } catch (e: any) {
      setError(t(e.message));
      setMessages((m) => m.slice(0, -1));
      setInput(message);
    } finally { setBusy(false); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setToast(t("Javob nusxalandi")); } catch { setToast(t("Nusxalab boʻlmadi")); }
  };

  return (
    <div className="px-4 py-4 lg:grid lg:grid-cols-[260px_1fr] lg:gap-5">
      {/* Suhbatlar tarixi */}
      <aside className={cn("mb-4 lg:mb-0 lg:block", showHistory ? "block" : "hidden")}>
        <div className="card-base p-3 lg:sticky lg:top-20">
          <Button variant="gradient" size="sm" className="w-full mb-3" onClick={newChat}><MessageSquarePlus className="h-4 w-4" /> {t("Yangi suhbat")}</Button>
          <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("Suhbatlar tarixi")}</p>
          {threads.length === 0 && <p className="px-1 text-xs text-slate-400">{t("Hali suhbat yoʻq.")}</p>}
          <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
            {threads.map((it) => (
              <li key={it.id} className={cn("group flex items-center gap-1 rounded-xl", it.id === threadId && "bg-teal-50 dark:bg-teal-900/20")}>
                <button type="button" onClick={() => openThread(it.id)} className="flex-1 min-w-0 px-2 py-2 text-left">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{it.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{it.count} {t("ta xabar")}</p>
                </button>
                <button type="button" onClick={() => removeThread(it.id)} className="p-2 text-slate-300 hover:text-red-500" aria-label={t("Suhbatni oʻchirish")}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex flex-col min-h-[70vh]">
        {locale !== "uz" && !aiEnabled && <p className="mb-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">{t("Kutubxona maqolalari va demo javoblar hozircha faqat oʻzbek tilida. AI rejimida (OpenAI kaliti bilan) javob tanlangan tilda beriladi.")}</p>}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {aiEnabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">{t("AI rejimi · OpenAI")}</span>
          ) : (
            <DemoBadge>{t("Demo rejim · AI emas")}</DemoBadge>
          )}
          <span className="text-xs text-slate-500">{t("Tashxis qoʻymaydi · dori dozasini aytmaydi")}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowHistory((s) => !s)}><History className="h-4 w-4" /> {t("Tarix")}</Button>
            <Link href="/library"><Button variant="outline" size="sm"><BookOpen className="h-4 w-4" /> {t("Kutubxona")}</Button></Link>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="card-base p-6 text-center">
              <span className="module-icon h-14 w-14 mb-3"><Bot className="h-7 w-7" /></span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t("Tibbiy atama yoki tahlil haqida soʻrang")}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {t("MEDAI tibbiy atamalarni oddiy tilda tushuntiradi va shifokorga beriladigan savollarni tayyorlashga yordam beradi.")}
                {!aiEnabled && t(" Hozir demo rejim: javoblar ichki kutubxona va qoidalar asosida tuziladi.")}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {TRY.map((it) => (
                  <button key={it.q} type="button" onClick={() => send(t(it.q))}
                    className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", it.safety ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700")}>
                    {it.safety && <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />}{t(it.label)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-primary px-4 py-2.5 text-sm text-white shadow whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-white"><Bot className="h-4 w-4" /></span>
                <div className="min-w-0 max-w-[90%] flex-1 space-y-2">
                  {m.flags?.emergency && <EmergencyBanner />}
                  <div className="card-base p-4 text-slate-700 dark:text-slate-200">
                    <div className="mb-2 flex items-center gap-2">
                      {m.mode === "ai" ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{t("AI")}</span> : <DemoBadge>{t("Demo · AI emas")}</DemoBadge>}
                      {m.aiFailed && <span className="text-[11px] text-amber-600">{t("AI javob bermadi — demo javob")}</span>}
                      <button type="button" onClick={() => copy(m.content)} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Nusxalash")}><Copy className="h-4 w-4" /></button>
                    </div>
                    <Markdown text={m.content} />
                    {(m.sources?.length || m.sourceNote) && (
                      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                        {!!m.sources?.length && (
                          <>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t("Qoʻshimcha oʻqish uchun manbalar")}</p>
                            <ul className="mt-1 space-y-1">
                              {m.sources.map((s, j) => (
                                <li key={j} className="text-xs"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-teal-700 dark:text-teal-400 underline">{s.title}</a> <span className="text-slate-400">— {s.org}</span></li>
                              ))}
                            </ul>
                          </>
                        )}
                        {m.sourceNote && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{t(m.sourceNote)}{m.dataDate ? ` ${t("Kutubxona yangilangan: {date}.", { date: m.dataDate })}` : ""}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> {t("MEDAI javob tayyorlamoqda…")}</div>
          )}
          <div ref={endRef} />
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-20 lg:bottom-4 mt-4 card-base flex items-end gap-2 p-2 shadow-card">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            maxLength={4000}
            placeholder={t("Savolingizni yozing… (masalan: Gemoglobin nima?)")}
            aria-label={t("Savol")}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none max-h-40 text-slate-800 dark:text-slate-100"
          />
          <Button type="submit" variant="gradient" size="icon" disabled={busy || !input.trim()} aria-label={t("Yuborish")}>{busy ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}</Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-400">{t("MEDAI shifokor oʻrnini bosmaydi. Shoshilinch holatda — 103 yoki 112.")}</p>
      </section>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}
