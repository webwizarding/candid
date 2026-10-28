"use client";
import type { ComponentProps } from "react";
import { toast } from "sonner";
export function ExternalLink({
  href,
  ...props
}: ComponentProps<"a"> & { href: string }) {
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={async (e) => {
        if (!("__TAURI_INTERNALS__" in window)) return;
        e.preventDefault();
        try {
          const { openUrl } = await import("@tauri-apps/plugin-opener");
          await openUrl(href);
        } catch {
          toast.error("Could not open this link in your browser.");
        }
      }}
    />
  );
}
