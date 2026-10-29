"use client";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { wikiMarkdown } from "@/lib/notes";
import { safeWebUrl } from "@/lib/event-location";
import { ExternalLink } from "./external-link";
export function MarkdownNote({
  body,
  onWiki,
}: {
  body: string;
  onWiki: (target: string) => void;
}) {
  return (
    <div className="note-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) =>
          url.startsWith("candid-note:") ? url : defaultUrlTransform(url)
        }
        components={{
          a: ({ href, children }) =>
            href?.startsWith("candid-note:") ? (
              <button
                className="note-wikilink"
                onClick={() => {
                  try {
                    onWiki(decodeURIComponent(href.slice(12)));
                  } catch {}
                }}
              >
                {children}
              </button>
            ) : href && safeWebUrl(href) ? (
              <ExternalLink href={href}>{children}</ExternalLink>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => (
            <span className="text-fg-2">
              [Image: {alt || "attachment"} — remote images are not loaded]
            </span>
          ),
          input: ({ checked }) => (
            <input
              type="checkbox"
              checked={Boolean(checked)}
              disabled
              aria-label={
                checked ? "Completed note task" : "Incomplete note task"
              }
            />
          ),
        }}
      >
        {wikiMarkdown(body)}
      </Markdown>
    </div>
  );
}
