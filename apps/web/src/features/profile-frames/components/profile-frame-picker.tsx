"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { ProfileFramePreview } from "./profile-frame-preview";
import { setProfileFrame } from "../attendee-actions";
import { toast } from "sonner";
import type { ProfileFrame } from "../constants";

interface ProfileFramePickerProps {
  eventId: string;
  frames: ProfileFrame[];
  currentFrameId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ProfileFramePicker({
  eventId,
  frames,
  currentFrameId,
  open,
  onClose,
}: ProfileFramePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentFrameId);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleApply() {
    startTransition(async () => {
      try {
        await setProfileFrame(eventId, selectedId);
        toast.success(selectedId ? "Frame applied!" : "Frame removed");
        onClose();
      } catch {
        toast.error("Failed to update frame");
      }
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Choose a Photo Frame</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {/* No frame option */}
          <button
            onClick={() => setSelectedId(null)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
              selectedId === null
                ? "border-primary bg-primary/5"
                : "border-transparent hover:border-muted"
            }`}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
              <X className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <span className="text-xs text-muted-foreground">No frame</span>
            {selectedId === null && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </button>

          {/* Frame options */}
          {frames.map((frame) => (
            <button
              key={frame.id}
              onClick={() => setSelectedId(frame.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                selectedId === frame.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-muted"
              }`}
            >
              <ProfileFramePreview label={frame.label} color={frame.color} size="sm" />
              {selectedId === frame.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isPending}>
            {isPending ? "Applying..." : "Apply"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
