"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { FloormapList } from "@/features/floormap/components/floormap-list";
import { FloormapEditor } from "@/features/floormap/components/floormap-editor";
import { UploadFloormapDialog } from "@/features/floormap/components/upload-floormap-dialog";
import type { Floormap, FloormapWithMarkers } from "@/features/floormap/queries";

export function FloormapPageClient({
  eventId,
  floormaps,
  initialFloormap,
  sessionLocations,
}: {
  eventId: string;
  floormaps: Floormap[];
  initialFloormap: FloormapWithMarkers | null;
  sessionLocations: string[];
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFloormap?.id ?? null
  );

  const activeFloormap =
    selectedId === initialFloormap?.id ? initialFloormap : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Floor Maps</h2>
          <p className="text-sm text-muted-foreground">
            Upload venue floor plans and place markers for session locations
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Map
        </Button>
      </div>

      <FloormapList
        floormaps={floormaps}
        eventId={eventId}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {activeFloormap && (
        <FloormapEditor
          floormap={activeFloormap}
          eventId={eventId}
          sessionLocations={sessionLocations}
        />
      )}

      <UploadFloormapDialog
        eventId={eventId}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}
