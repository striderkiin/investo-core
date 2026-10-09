import type { ReactNode } from 'react';

const SAFE_HREF = /^(\/|#|https?:\/\/|mailto:)/i;

/** **bold** and [text](/link) inside one line. Plain React elements, never raw HTML. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const rx = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={m.index}>{m[1]}</strong>);
    else if (SAFE_HREF.test(m[3])) out.push(<a key={m.index} href={m[3]} rel={m[3].startsWith('http') ? 'noopener noreferrer' : undefined}>{m[2]}</a>);
    else out.push(m[2]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Renders the simple format used for legal pages: blank lines separate
 * blocks, "## " starts a heading, "- " starts a list item.
 */
export function LegalDocument({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) nodes.push(<ul key={`ul-${nodes.length}`}>{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
    list = [];
  };
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.startsWith('- '))) {
      list.push(...lines.map((l) => l.slice(2)));
      continue;
    }
    flush();
    if (block.startsWith('## ')) nodes.push(<h2 key={nodes.length} className="h5 mt-4 mb-2">{inline(block.slice(3))}</h2>);
    else nodes.push(<p key={nodes.length}>{inline(lines.join(' '))}</p>);
  }
  flush();
  return <>{nodes}</>;
}
