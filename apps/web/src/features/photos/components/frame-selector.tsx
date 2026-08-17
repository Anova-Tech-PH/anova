"use client";

import { Ban } from "lucide-react";

import type { BoothFrame } from "@/features/photo-booth/constants";
import { FramePreview } from "@/features/photo-booth/components/frame-preview";

interface FrameSelectorProps {
  frames: BoothFrame[];
  selectedFrameId: string | null;
  onSelect: (frameId: string | null) => void;
}

export function FrameSelector({ frames, selectedFrameId, onSelect }: FrameSelectorProps) {
  if (frames.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {/* No frame option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-md p-2 transition-colors ${
          selectedFrameId === null
            ? "ring-2 ring-primary"
            : "border border-muted hover:border-muted-foreground/30"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
          <Ban className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">None</span>
      </button>

      {/* Frame options */}
      {frames.map((frame) => (
        <button
          key={frame.id}
          type="button"
          onClick={() => onSelect(frame.id)}
          className={`flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-md p-2 transition-colors ${
            selectedFrameId === frame.id
              ? "ring-2 ring-primary"
              : "border border-muted hover:border-muted-foreground/30"
          }`}
        >
          <FramePreview
            template={frame.template}
            message={frame.message}
            color={frame.color}
            size="sm"
          />
        </button>
      ))}
    </div>
  );
}
