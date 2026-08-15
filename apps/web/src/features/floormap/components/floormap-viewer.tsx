"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@attendly/ui/cn";
import type { FloormapWithMarkers } from "../queries";

export function FloormapViewer({
  floormap,
  highlightLabel,
}: {
  floormap: FloormapWithMarkers;
  highlightLabel?: string;
}) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(
    highlightLabel ?? null
  );
  const markers = floormap.floormap_markers ?? [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 space-y-1 lg:w-56">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Locations
        </p>
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMarker(m.label)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
              selectedMarker === m.label
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-foreground"
            )}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative overflow-hidden rounded-lg border">
          <img
            src={floormap.image_url}
            alt={floormap.name}
            className="block w-full"
          />
          {markers.map((m) => (
            <div
              key={m.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform",
                selectedMarker === m.label && "scale-125 z-10"
              )}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              onClick={() => setSelectedMarker(m.label)}
            >
              <MapPin
                className={cn(
                  "h-7 w-7 drop-shadow-md",
                  selectedMarker === m.label
                    ? "text-primary fill-primary/20"
                    : "text-red-600 fill-red-600/20"
                )}
              />
              <span className="absolute left-1/2 top-full -translate-x-1/2 mt-0.5 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
