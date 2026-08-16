"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@attendly/ui/cn";
import { updatePointRule } from "@/features/gamification/actions";
import type { PointRule } from "@/features/gamification/queries";

const ACTIVITY_LABELS: Record<string, string> = {
  poll_vote: "Vote in a poll",
  session_feedback: "Submit session feedback",
  session_rsvp: "RSVP to a session",
  community_post: "Community board post",
  community_comment: "Community board comment",
  profile_update: "Update profile",
  meetup_join: "Join a meet-up",
  photo_upload: "Upload a photo",
  message_sent: "Send a message",
  survey_complete: "Complete a survey",
  caption_submit: "Submit a caption",
  icebreaker_answer: "Answer an icebreaker",
  trivia_complete: "Complete trivia",
  exhibitor_visit: "Visit an exhibitor",
  session_checkin: "Check in to a session",
  referral_registration: "Referral registration",
};

type Props = {
  eventId: string;
  rules: PointRule[];
};

export function PointRulesEditor({ eventId, rules }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleUpdate(
    ruleId: string,
    data: { points?: number; max_per_event?: number | null; enabled?: boolean }
  ) {
    startTransition(async () => {
      try {
        await updatePointRule(eventId, ruleId, data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update rule"
        );
      }
    });
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px_60px] items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Activity</span>
        <span className="text-center">Points</span>
        <span className="text-center">Max/Event</span>
        <span className="text-center">Active</span>
      </div>

      {/* Rules */}
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={cn(
            "grid grid-cols-[1fr_80px_80px_60px] items-center gap-3 rounded-lg border px-3 py-2.5 transition-opacity",
            isPending && "opacity-60",
            !rule.enabled && "opacity-50"
          )}
        >
          {/* Activity label */}
          <span className="text-sm font-medium">
            {ACTIVITY_LABELS[rule.activity_type] ?? rule.activity_type}
          </span>

          {/* Points input */}
          <input
            type="number"
            min={0}
            defaultValue={rule.points}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val !== rule.points) {
                handleUpdate(rule.id, { points: val });
              }
            }}
            className="h-8 w-full rounded-md border bg-transparent px-2 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {/* Max per event input */}
          <input
            type="number"
            min={0}
            defaultValue={rule.max_per_event ?? ""}
            placeholder="∞"
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const newVal = raw === "" ? null : parseInt(raw, 10);
              if (newVal !== rule.max_per_event) {
                handleUpdate(rule.id, {
                  max_per_event: isNaN(newVal as number) ? null : newVal,
                });
              }
            }}
            className="h-8 w-full rounded-md border bg-transparent px-2 text-center text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {/* Enabled toggle */}
          <div className="flex justify-center">
            <button
              type="button"
              role="switch"
              aria-checked={rule.enabled}
              onClick={() => handleUpdate(rule.id, { enabled: !rule.enabled })}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                rule.enabled
                  ? "bg-[oklch(0.445_0.107_195)]"
                  : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  rule.enabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
