"use client";

import { CheckCircle2, Circle } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  poll_vote: "Vote in a poll",
  session_feedback: "Submit session feedback",
  session_rsvp: "RSVP to a session",
  community_post: "Post on community board",
  community_comment: "Comment on community board",
  profile_update: "Update your profile",
  meetup_join: "Join a meet-up",
  photo_upload: "Upload a photo",
  message_sent: "Send a message",
  survey_complete: "Complete a survey",
};

export function ChallengesList({
  challenges,
}: {
  challenges: { activityType: string; count: number; pointsPerAction: number; enabled: boolean }[];
}) {
  const active = challenges.filter((c) => c.enabled);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Challenges</h3>
      {active.map((c) => (
        <div key={c.activityType} className="flex items-center gap-2 text-sm">
          {c.count > 0 ? (
            <CheckCircle2 className="h-4 w-4 text-[oklch(0.445_0.107_195)]" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={c.count > 0 ? "" : "text-muted-foreground"}>
            {ACTIVITY_LABELS[c.activityType] ?? c.activityType}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {c.pointsPerAction} pts {c.count > 0 && `(x${c.count})`}
          </span>
        </div>
      ))}
    </div>
  );
}
