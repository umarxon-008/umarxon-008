import * as React from "react";

/** Xavfsiz, minimal markdown: HTML ishlatilmaydi (dangerouslySetInnerHTML yo'q). */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${key}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) || [];
      out.push(<a key={`${key}-a${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-teal-700 dark:text-teal-400 underline">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const k = `l${blocks.length}`;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, `${k}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={k} className="list-decimal pl-5 space-y-1">{items}</ol> : <ul key={k} className="list-disc pl-5 space-y-1">{items}</ul>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (h) { flushPara(); flushList(); blocks.push(<p key={`h${blocks.length}`} className="font-bold text-slate-900 dark:text-white">{inline(h[1], `h${blocks.length}`)}</p>); continue; }
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ul || ol)![1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
}
