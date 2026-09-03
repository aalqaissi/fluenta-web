import * as React from "react";

export interface Highlight {
  para: number;
  text: string;
  color: string; // key: yellow/green/blue/rose/purple
}

const colorClass: Record<string, string> = {
  yellow: "bg-yellow-200/80",
  green: "bg-green-200/80",
  blue: "bg-sky-200/80",
  rose: "bg-rose-200/80",
  purple: "bg-purple-200/80",
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderParagraph(text: string, para: number, highlights: Highlight[], find: string) {
  const parts: { t: string; cls?: string }[] = [{ t: text }];
  const tokens: { t: string; cls: string }[] = [];
  for (const h of highlights.filter((h) => h.para === para)) {
    if (h.text.trim()) tokens.push({ t: h.text, cls: colorClass[h.color] ?? "bg-yellow-200/80" });
  }
  if (find.trim().length >= 2) tokens.push({ t: find, cls: "bg-secondary/40 outline outline-1 outline-secondary rounded-[3px]" });

  let segments = parts;
  for (const tok of tokens) {
    const re = new RegExp(escapeRegExp(tok.t), "gi");
    const next: typeof segments = [];
    for (const seg of segments) {
      if (seg.cls) {
        next.push(seg);
        continue;
      }
      let last = 0;
      let m: RegExpExecArray | null;
      const s = seg.t;
      re.lastIndex = 0;
      while ((m = re.exec(s)) !== null) {
        if (m.index > last) next.push({ t: s.slice(last, m.index) });
        next.push({ t: m[0], cls: tok.cls });
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < s.length) next.push({ t: s.slice(last) });
    }
    segments = next;
  }

  return segments.map((seg, i) =>
    seg.cls ? (
      <mark key={i} className={`${seg.cls} rounded-[3px] px-0.5 text-inherit`}>
        {seg.t}
      </mark>
    ) : (
      <React.Fragment key={i}>{seg.t}</React.Fragment>
    )
  );
}

export function HighlightableText({
  paragraphs,
  highlights,
  find,
  activeColor,
  onHighlight,
}: {
  paragraphs: string[];
  highlights: Highlight[];
  find: string;
  activeColor: string | null;
  onHighlight: (h: Highlight) => void;
}) {
  function handleMouseUp(para: number) {
    if (!activeColor) return;
    const sel = window.getSelection();
    const text = sel?.toString() ?? "";
    if (text.trim().length > 0) {
      onHighlight({ para, text: text.trim(), color: activeColor });
      sel?.removeAllRanges();
    }
  }

  return (
    <div className="space-y-4 text-[15px] leading-[1.75] text-foreground/90">
      {paragraphs.map((p, i) => (
        <p key={i} onMouseUp={() => handleMouseUp(i)} className={activeColor ? "cursor-text" : undefined}>
          {renderParagraph(p, i, highlights, find)}
        </p>
      ))}
    </div>
  );
}
