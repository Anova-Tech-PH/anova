"use client";

import { useState, useRef } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@attendly/ui/cn";
import { Button, Input } from "@attendly/ui/components";
import { upsertMarker, deleteMarker } from "../actions";
import type { FloormapWithMarkers } from "../queries";

type Marker = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export function FloormapEditor({
  floormap,
  eventId,
  sessionLocations,
}: {
  floormap: FloormapWithMarkers;
  eventId: string;
  sessionLocations: string[];
}) {
  const [markers, setMarkers] = useState<Marker[]>(
    floormap.floormap_markers ?? []
  );
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [placingLabel, setPlacingLabel] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const placedLabels = new Set(markers.map((m) => m.label));
  const unplacedLocations = sessionLocations.filter(
    (loc) => !placedLabels.has(loc)
  );

  function getRelativePosition(e: React.MouseEvent) {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  async function handleMapClick(e: React.MouseEvent) {
    if (!placingLabel) return;
    const pos = getRelativePosition(e);
    if (!pos) return;

    const label = placingLabel;
    setPlacingLabel(null);

    try {
      await upsertMarker(floormap.id, eventId, {
        label,
        x: pos.x,
        y: pos.y,
      });
      setMarkers((prev) => [
        ...prev,
        { id: crypto.randomUUID(), label, x: pos.x, y: pos.y },
      ]);
      toast.success(`Placed "${label}" on map`);
    } catch {
      toast.error("Failed to place marker");
    }
  }

  async function handleMarkerDragEnd(markerId: string, e: React.MouseEvent) {
    const pos = getRelativePosition(e);
    if (!pos) return;
    setDragging(null);

    const marker = markers.find((m) => m.id === markerId);
    if (!marker) return;

    setMarkers((prev) =>
      prev.map((m) => (m.id === markerId ? { ...m, x: pos.x, y: pos.y } : m))
    );

    try {
      await upsertMarker(floormap.id, eventId, {
        id: markerId,
        label: marker.label,
        x: pos.x,
        y: pos.y,
      });
    } catch {
      toast.error("Failed to update marker position");
    }
  }

  async function handleDeleteMarker(markerId: string) {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    setSelectedMarker(null);
    try {
      await deleteMarker(markerId, eventId);
      toast.success("Marker removed");
    } catch {
      toast.error("Failed to remove marker");
    }
  }

  async function handleAddCustomLocation() {
    if (!newLabel.trim()) return;
    setPlacingLabel(newLabel.trim());
    setNewLabel("");
    toast.info(`Click on the map to place "${newLabel.trim()}"`);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Left panel: location list */}
      <div className="w-full shrink-0 space-y-3 lg:w-64">
        <h3 className="text-sm font-semibold">Locations</h3>

        {unplacedLocations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              From agenda sessions:
            </p>
            {unplacedLocations.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  setPlacingLabel(loc);
                  toast.info(`Click on the map to place "${loc}"`);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
                  placingLabel === loc
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {loc}
              </button>
            ))}
          </div>
        )}

        {markers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Placed on map:</p>
            {markers.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                  selectedMarker === m.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => setSelectedMarker(m.id)}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" />
                <span className="flex-1 truncate">{m.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMarker(m.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1.5">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Custom location..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddCustomLocation()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0"
            onClick={handleAddCustomLocation}
            disabled={!newLabel.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Right panel: map image with markers */}
      <div className="flex-1 min-w-0">
        <div
          ref={imageRef}
          className={cn(
            "relative cursor-crosshair overflow-hidden rounded-lg border bg-muted/30",
            placingLabel && "ring-2 ring-primary"
          )}
          onClick={handleMapClick}
        >
          <img
            src={floormap.image_url}
            alt={floormap.name}
            className="block w-full"
            draggable={false}
          />
          {markers.map((m) => (
            <div
              key={m.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-full cursor-grab select-none transition-transform",
                selectedMarker === m.id && "scale-125 z-10",
                dragging === m.id && "cursor-grabbing"
              )}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(m.id);
              }}
              draggable
              onDragStart={() => setDragging(m.id)}
              onDragEnd={(e) => handleMarkerDragEnd(m.id, e)}
            >
              <MapPin
                className={cn(
                  "h-7 w-7 drop-shadow-md",
                  selectedMarker === m.id
                    ? "text-primary fill-primary/20"
                    : "text-red-600 fill-red-600/20"
                )}
              />
              <span className="absolute left-1/2 top-full -translate-x-1/2 mt-0.5 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-[10px] text-white">
                {m.label}
              </span>
            </div>
          ))}
          {placingLabel && (
            <div className="absolute inset-x-0 top-0 bg-primary/90 px-3 py-1.5 text-center text-sm text-primary-foreground">
              Click to place &quot;{placingLabel}&quot; &mdash;{" "}
              <button
                type="button"
                className="underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setPlacingLabel(null);
                }}
              >
                cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
