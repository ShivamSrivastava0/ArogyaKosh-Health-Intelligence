import { Fragment } from 'react';

/** Minimal, safe markdown: **bold**, _italic_/*italic*, `code`, bullet & numbered lists, paragraphs. */
const inline = (text, keyBase) => {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i += 1}`;
    if (t.startsWith('**')) parts.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) parts.push(<code key={k} className="rounded bg-paper px-1 font-mono text-[0.9em]">{t.slice(1, -1)}</code>);
    else parts.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

export default function Markdown({ text = '' }) {
  const blocks = [];
  let list = null;
  text.split('\n').forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)/);
    if (bullet || num) {
      const type = bullet ? 'ul' : 'ol';
      if (!list || list.type !== type) { list = { type, items: [] }; blocks.push(list); }
      list.items.push(bullet ? bullet[1] : num[2]);
      return;
    }
    list = null;
    if (!line.trim()) return;
    const h = line.match(/^#{1,4}\s+(.*)/);
    blocks.push({ type: h ? 'h' : 'p', text: h ? h[1] : line, idx });
  });
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.type === 'ul' || b.type === 'ol') {
          const L = b.type;
          return <L key={i} className={L === 'ul' ? 'list-disc space-y-1 pl-5' : 'list-decimal space-y-1 pl-5'}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</L>;
        }
        if (b.type === 'h') return <p key={i} className="font-semibold">{inline(b.text, i)}</p>;
        return <p key={i}>{inline(b.text, i).map((x, j) => <Fragment key={j}>{x}</Fragment>)}</p>;
      })}
    </div>
  );
}
