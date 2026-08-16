"use client";

import { useState, useRef, useCallback } from "react";
import { MapPin, Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markers = floormap.floormap_markers ?? [];

  const filtered = searchQuery.trim()
    ? markers.filter((m) =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : markers;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 space-y-1 lg:w-56">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Locations
        </p>
        {filtered.length > 0 ? (
          filtered.map((m) => (
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
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No locations match your search.
          </p>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">{floormap.name}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Reset zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          ref={mapContainerRef}
          className={cn(
            "relative overflow-hidden rounded-lg border",
            zoom > 1 ? "cursor-grab" : "",
            isPanning ? "cursor-grabbing" : ""
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.2s ease",
            }}
          >
            <img
              src={floormap.image_url}
              alt={floormap.name}
              className="block w-full select-none"
              draggable={false}
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
    </div>
  );
}
