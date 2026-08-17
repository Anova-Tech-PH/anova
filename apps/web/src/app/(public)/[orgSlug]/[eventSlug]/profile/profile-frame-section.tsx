"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { ProfileFramePicker } from "@/features/profile-frames/components/profile-frame-picker";
import type { ProfileFrame } from "@/features/profile-frames/constants";

interface ProfileFrameSectionProps {
  eventId: string;
  frames: ProfileFrame[];
  currentFrameId: string | null;
}

export function ProfileFrameSection({
  eventId,
  frames,
  currentFrameId,
}: ProfileFrameSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentFrame = currentFrameId
    ? frames.find((f) => f.id === currentFrameId) ?? null
    : null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-2 text-sm font-semibold">Photo Frame</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Add a colored ring frame to your profile photo.
      </p>

      <div className="flex items-center gap-3">
        {currentFrame && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: currentFrame.color }}
          >
            {currentFrame.label}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {currentFrame ? "Change Frame" : "Add Photo Frame"}
        </Button>
      </div>

      <ProfileFramePicker
        eventId={eventId}
        frames={frames}
        currentFrameId={currentFrameId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
