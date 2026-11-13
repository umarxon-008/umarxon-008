import { Fragment } from 'react';
import { parseMarkdown, type Inline } from '../lib/markdown';

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.type) {
          case 'text':
            return <Fragment key={i}>{n.text}</Fragment>;
          case 'code':
            return <code key={i}>{n.text}</code>;
          case 'bold':
            return (
              <strong key={i}>
                <InlineNodes nodes={n.children} />
              </strong>
            );
          case 'italic':
            return (
              <em key={i}>
                <InlineNodes nodes={n.children} />
              </em>
            );
        }
      })}
    </>
  );
}

/** AI javobini xavfsiz ko'rsatadi (HTML yo'q, faqat React elementlari). */
export function Markdown({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'paragraph':
            return (
              <p key={i}>
                <InlineNodes nodes={b.children} />
              </p>
            );
          case 'heading': {
            const H = `h${b.level + 2}` as 'h3' | 'h4' | 'h5';
            return (
              <H key={i}>
                <InlineNodes nodes={b.children} />
              </H>
            );
          }
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul';
            return (
              <L key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <InlineNodes nodes={item} />
                  </li>
                ))}
              </L>
            );
          }
          case 'code':
            return (
              <pre key={i} data-lang={b.lang || undefined}>
                <code>{b.text}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
