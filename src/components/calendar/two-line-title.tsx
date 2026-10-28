"use client";

import { useLayoutEffect, useRef, useState } from "react";

let canvas: HTMLCanvasElement | null = null;

/** Greedy word wrap using the element's real font, like Figma's text layout. */
function wrap(text: string, el: HTMLElement): string[] {
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.letterSpacing = cs.letterSpacing;
  ctx.fontKerning = "normal";
  const max = el.clientWidth;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Wraps by words but, when the text needs more than two lines, ends the second
 * line with a character-level ellipsis — matching how the design truncates
 * ("Submit / medical certi…") rather than CSS line-clamp's whole-word cut.
 */
export function TwoLineTitle({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState<[string, string] | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const all = wrap(text, el);
      setLines(all.length > 2 ? [all[0], all.slice(1).join(" ")] : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [text]);

  return (
    <p ref={ref} className={className} title={lines ? text : undefined}>
      {lines ? (
        <>
          <span className="block">{lines[0]}</span>
          <span className="block truncate">{lines[1]}</span>
        </>
      ) : (
        <span className="line-clamp-2 break-words">{text}</span>
      )}
    </p>
  );
}
