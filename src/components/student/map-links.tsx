"use client";
import { ExternalLink, Navigation } from "lucide-react";
import { toast } from "sonner";
import { googleMapsUrl } from "@/lib/maps";
export function MapLinks({ location }: { location: string }) {
  if (!location.trim()) return null;
  const open = async (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if ("__TAURI_INTERNALS__" in window) {
      e.preventDefault();
      try {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(url);
      } catch {
        toast.error(
          "Could not open Maps. Copy the location into your browser.",
        );
      }
    }
  };
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand">
      <a
        className="flex items-center gap-1"
        href={googleMapsUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => void open(e, googleMapsUrl(location))}
      >
        <ExternalLink size={12} /> Google Maps
      </a>
      <a
        className="flex items-center gap-1"
        href={googleMapsUrl(location, true)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => void open(e, googleMapsUrl(location, true))}
      >
        <Navigation size={12} /> Walking directions
      </a>
    </div>
  );
}
