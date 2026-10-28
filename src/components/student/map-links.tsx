"use client";
import { useState } from "react";
import { Map, Navigation, Video } from "lucide-react";
import { googleMapsUrl, appleMapsUrl, googleMapsEmbedUrl } from "@/lib/maps";
import { eventLocation } from "@/lib/event-location";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "./external-link";
export function MapLinks({
  location,
  notes = "",
  preview = false,
}: {
  location: string;
  notes?: string;
  preview?: boolean;
}) {
  const [loadedLocation, setLoadedLocation] = useState("");
  const info = eventLocation(location, notes);
  if (!info.physical)
    return info.meeting ? (
      <ExternalLink
        href={info.meeting}
        className="flex w-fit items-center gap-2 rounded-lg bg-brand-tint px-3 py-2 text-sm font-medium text-brand"
      >
        <Video size={16} /> Join meeting
      </ExternalLink>
    ) : null;
  const loaded = loadedLocation === location;
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand">
        <ExternalLink
          className="flex items-center gap-1"
          href={googleMapsUrl(location)}
        >
          <Map size={12} /> Google Maps
        </ExternalLink>
        <ExternalLink
          className="flex items-center gap-1"
          href={appleMapsUrl(location)}
        >
          Apple Maps
        </ExternalLink>
        <ExternalLink
          className="flex items-center gap-1"
          href={googleMapsUrl(location, true)}
        >
          <Navigation size={12} /> Walk
        </ExternalLink>
      </div>
      {preview &&
        (loaded ? (
          <div className="overflow-hidden rounded-xl border border-hairline">
            <iframe
              title={`Map of ${location}`}
              src={googleMapsEmbedUrl(location)}
              className="h-48 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
            <button
              className="w-full bg-app px-3 py-2 text-xs text-fg-2 hover:bg-hover"
              onClick={() => setLoadedLocation("")}
            >
              Close map
            </button>
          </div>
        ) : (
          <div className="grid justify-items-start gap-2 rounded-xl border border-hairline bg-app p-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLoadedLocation(location)}
            >
              <Map /> Show map
            </Button>
            <p className="text-xs leading-relaxed text-fg-2">
              Loads Google Maps and shares this location with Google.
            </p>
          </div>
        ))}
    </div>
  );
}
