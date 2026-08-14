"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";
import { toast } from "sonner";
import {
  enableGamification,
  disableGamification,
  updateGamificationConfig,
} from "@/features/gamification/actions";
import type {
  GamificationConfig,
  PointRule,
} from "@/features/gamification/queries";
import { PointRulesEditor } from "./point-rules-editor";

type Props = {
  eventId: string;
  config: GamificationConfig | null;
  rules: PointRule[];
};

export function GamificationSetup({ eventId, config, rules }: Props) {
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        if (next) {
          await enableGamification(eventId);
          toast.success("Gamification enabled");
        } else {
          await disableGamification(eventId);
          toast.success("Gamification disabled");
        }
      } catch (err) {
        setEnabled(!next);
        toast.error(
          err instanceof Error ? err.message : "Failed to toggle gamification"
        );
      }
    });
  }

  function handleConfigBlur(
    field: "leaderboard_title" | "hide_organizers" | "prizes_description",
    value: string | boolean
  ) {
    startTransition(async () => {
      try {
        await updateGamificationConfig(eventId, { [field]: value });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update settings"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gamification</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Award points, badges, and show leaderboards to boost attendee
                engagement.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isPending}
              onClick={handleToggle}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                enabled
                  ? "bg-[oklch(0.445_0.107_195)]"
                  : "bg-muted",
                isPending && "opacity-60 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* Settings (only visible when enabled) */}
      {enabled && (
        <>
          {/* Leaderboard Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leaderboard Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="leaderboard-title"
                  className="text-sm font-medium"
                >
                  Leaderboard title
                </label>
                <input
                  id="leaderboard-title"
                  type="text"
                  defaultValue={config?.leaderboard_title ?? "Leaderboard"}
                  onBlur={(e) =>
                    handleConfigBlur("leaderboard_title", e.target.value)
                  }
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Hide Organizers Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Hide organizers</p>
                  <p className="text-xs text-muted-foreground">
                    Exclude organizer accounts from the public leaderboard
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config?.hide_organizers ?? false}
                  onClick={() =>
                    handleConfigBlur(
                      "hide_organizers",
                      !(config?.hide_organizers ?? false)
                    )
                  }
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    (config?.hide_organizers ?? false)
                      ? "bg-[oklch(0.445_0.107_195)]"
                      : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      (config?.hide_organizers ?? false)
                        ? "translate-x-4"
                        : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Prizes Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="prizes-description"
                  className="text-sm font-medium"
                >
                  Prizes description
                </label>
                <textarea
                  id="prizes-description"
                  rows={3}
                  defaultValue={config?.prizes_description ?? ""}
                  placeholder="Describe what attendees can win..."
                  onBlur={(e) =>
                    handleConfigBlur("prizes_description", e.target.value)
                  }
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* Point Values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Point Values</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how many points each activity is worth.
              </p>
            </CardHeader>
            <CardContent>
              <PointRulesEditor eventId={eventId} rules={rules} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
