"use client";

import { useT, useLocale } from "@/i18n/client";
import * as React from "react";
import { Bot, Copy, MessageSquarePlus, Send, Trash2, ShieldAlert, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { api, EmergencyBanner, Modal, Toast } from "@/components/modules/common";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="gradient" onClick={newChat}><MessageSquarePlus className="h-5 w-5" /> {t("Yangi suhbat")}</Button>
        <Button variant="outline" onClick={() => setShowHistory(true)}><History className="h-5 w-5" /> {t("Oldingi suhbatlar")}</Button>
      </div>

      <section className="flex min-h-[60vh] flex-col">
        <div className="flex-1 space-y-5">
          {messages.length === 0 && (
            <div className="card-base p-6 sm:p-8 text-center">
              <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><Bot className="h-8 w-8" /></span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("Savolingizni yozing")}</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{t("Tahlil, dori yoki tibbiy atama haqida soʻrang")}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {TRY.map((it) => (
                  <button key={it.q} type="button" onClick={() => send(t(it.q))}
                    className={cn("rounded-2xl border px-4 py-4 text-left text-base font-semibold transition", it.safety ? "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200" : "border-slate-200 bg-white text-slate-800 hover:border-primary-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100")}>
                    {it.safety && <ShieldAlert className="mr-1.5 inline h-5 w-5" />}{t(it.label)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-4 py-3 text-base text-white whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                {m.flags?.emergency && <EmergencyBanner />}
                <div className="card-base p-5 text-base text-slate-800 dark:text-slate-100">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 dark:text-primary-300"><Bot className="h-5 w-5" />MEDAI</span>
                    <button type="button" onClick={() => copy(m.content)} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Nusxalash")}><Copy className="h-5 w-5" /></button>
                  </div>
                  <Markdown text={m.content} />
                  {!!m.sources?.length && (
                    <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <summary className="cursor-pointer text-sm font-semibold text-primary-700 dark:text-primary-300">{t("Manbalar")} ({m.sources.length})</summary>
                      <ul className="mt-2 space-y-1.5">
                        {m.sources.map((s, j) => (
                          <li key={j} className="text-sm"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary-700 underline dark:text-primary-300">{s.title}</a> <span className="text-slate-500">— {s.org}</span></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )
          )}
          {busy && (
            <div className="flex items-center gap-2 text-base text-slate-600 dark:text-slate-300"><LoadingSpinner size="sm" /> {t("MEDAI javob tayyorlamoqda…")}</div>
          )}
          <div ref={endRef} />
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="sticky bottom-24 lg:bottom-6 mt-6 flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            maxLength={4000}
            placeholder={t("Savolingizni yozing…")}
            aria-label={t("Savol")}
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-3 text-lg text-slate-800 outline-none dark:text-slate-100"
          />
          <Button type="submit" variant="gradient" className="h-12 w-12 shrink-0 rounded-2xl p-0" disabled={busy || !input.trim()} aria-label={t("Yuborish")}>{busy ? <LoadingSpinner size="sm" /> : <Send className="h-5 w-5" />}</Button>
        </form>
      </section>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title={t("Oldingi suhbatlar")}>
        {threads.length === 0 ? <p className="text-base text-slate-600 dark:text-slate-300">{t("Hali suhbat yoʻq.")}</p> : (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {threads.map((it) => (
              <li key={it.id} className={cn("flex items-center gap-1 rounded-xl", it.id === threadId && "bg-primary-50 dark:bg-primary-900/20")}>
                <button type="button" onClick={() => openThread(it.id)} className="min-w-0 flex-1 px-3 py-3 text-left">
                  <p className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">{it.title}</p>
                  <p className="text-sm text-slate-500">{it.count} {t("ta xabar")}</p>
                </button>
                <button type="button" onClick={() => removeThread(it.id)} className="p-3 text-slate-400 hover:text-red-500" aria-label={t("Suhbatni oʻchirish")}><Trash2 className="h-5 w-5" /></button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}
