/**
 * Minimal va xavfsiz Markdown parser (AI javoblari uchun).
 * HTML umuman qabul qilinmaydi: natija React elementlariga aylantiriladi, shuning uchun XSS imkonsiz.
 */
export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'heading'; level: 1 | 2 | 3; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'code'; lang: string; text: string };

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  // Havolalar faqat https (javascript:, file:, data: va boshqalar oddiy matn bo'lib qoladi)
  const re =
    /(`[^`\n]+`)|(\[[^\]\n]+\]\(https:\/\/[^\s)]+\))|(https:\/\/[^\s<>()]+[^\s<>().,;:!?'"»”])|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('`')) out.push({ type: 'code', text: tok.slice(1, -1) });
    else if (tok.startsWith('[')) {
      const m2 = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(tok)!;
      out.push({ type: 'link', text: m2[1]!, href: m2[2]! });
    } else if (tok.startsWith('https://')) out.push({ type: 'link', text: tok, href: tok });
    else if (tok.startsWith('**')) out.push({ type: 'bold', children: parseInline(tok.slice(2, -2)) });
    else out.push({ type: 'italic', children: parseInline(tok.slice(1, -1)) });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'paragraph', children: parseInline(para.join('\n')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'list', ...list });
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fence = line.match(/^```\s*([\w+#.-]*)\s*$/);
    if (fence) {
      flushPara();
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) code.push(lines[i++]!);
      blocks.push({ type: 'code', lang: fence[1] ?? '', text: code.join('\n') });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({
        type: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        children: parseInline(heading[2]!),
      });
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushPara();
      const isOrdered = Boolean(ordered);
      if (list && list.ordered !== isOrdered) flushList();
      if (!list) list = { ordered: isOrdered, items: [] };
      list.items.push(parseInline((bullet ?? ordered)![1]!));
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Qisqa ko'rinish: Markdown belgilari olib tashlanadi, kod bloklari "[kod]" bilan almashtiriladi. */
export function plainPreview(text: string, max = 140): string {
  const one = text
    .replace(/```[\s\S]*?(```|$)/g, ' [kod] ')
    .replace(/[*`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}
