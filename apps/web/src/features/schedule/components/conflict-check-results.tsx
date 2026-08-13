"use client";

import { AlertTriangle, CheckCircle, MapPin, Users, Layers } from "lucide-react";
import { Card, Badge } from "@attendly/ui/components";
import type { Conflict } from "../conflict-check";

const conflictConfig = {
  room: {
    icon: MapPin,
    label: "Room Conflict",
    variant: "destructive" as const,
    color: "text-red-500",
  },
  speaker: {
    icon: Users,
    label: "Speaker Conflict",
    variant: "warning" as const,
    color: "text-amber-500",
  },
  track: {
    icon: Layers,
    label: "Track Conflict",
    variant: "info" as const,
    color: "text-blue-500",
  },
};

export function ConflictCheckResults({
  conflicts,
}: {
  conflicts: Conflict[];
}) {
  if (conflicts.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
        <div>
          <h3 className="font-semibold">No Conflicts Found</h3>
          <p className="text-sm text-muted-foreground">
            All sessions are clear of scheduling conflicts.
          </p>
        </div>
      </Card>
    );
  }

  const roomConflicts = conflicts.filter((c) => c.type === "room");
  const speakerConflicts = conflicts.filter((c) => c.type === "speaker");
  const trackConflicts = conflicts.filter((c) => c.type === "track");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <p className="text-sm font-medium">
          {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}{" "}
          detected
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">
            {roomConflicts.length}
          </p>
          <p className="text-xs text-muted-foreground">Room conflicts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">
            {speakerConflicts.length}
          </p>
          <p className="text-xs text-muted-foreground">Speaker conflicts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">
            {trackConflicts.length}
          </p>
          <p className="text-xs text-muted-foreground">Track conflicts</p>
        </Card>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict, i) => {
          const config = conflictConfig[conflict.type];
          const Icon = config.icon;
          return (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={config.variant} className="text-[10px]">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {conflict.detail}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">
                      {conflict.sessionTitles[0]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      conflicts with
                    </span>
                    <span className="font-medium">
                      {conflict.sessionTitles[1]}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
