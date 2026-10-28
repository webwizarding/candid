import { noteParts } from "@/lib/event-location";
import { ExternalLink } from "./external-link";
export function EventNotes({ text }: { text: string }) {
  return (
    <p className="t-14 whitespace-pre-wrap leading-relaxed text-fg [overflow-wrap:anywhere]">
      {noteParts(text).map((part, i) =>
        part.url ? (
          <ExternalLink
            key={i}
            href={part.url}
            className="text-brand underline underline-offset-2"
          >
            {part.text}
          </ExternalLink>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}
