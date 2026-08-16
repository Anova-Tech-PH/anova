"use client";

import Link from "next/link";
import {
  ACTIVITY_LABELS,
  CHALLENGE_CATEGORIES,
  CHALLENGE_LINKS,
} from "../constants";

type Challenge = {
  activityType: string;
  count: number;
  pointsPerAction: number;
  maxPerEvent: number | null;
  enabled: boolean;
};

export function MyPointsPanel({
  userName,
  totalPoints,
  rank,
  completionPercent,
  challenges,
  basePath,
}: {
  userName: string;
  totalPoints: number;
  rank: number | null;
  completionPercent: number;
  challenges: Challenge[];
  basePath: string;
}) {
  const challengeMap = new Map(challenges.map((c) => [c.activityType, c]));

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="rounded-t-xl bg-[oklch(0.445_0.107_195)] px-4 py-3 text-white">
        <h3 className="font-semibold">My Points</h3>
      </div>

      {/* User summary */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)]/10 text-sm font-semibold text-[oklch(0.445_0.107_195)]">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{userName}</p>
            <p className="text-sm text-muted-foreground">{totalPoints} points</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Challenge completion</p>
            <p className="font-semibold">{completionPercent}%</p>
            <p className="text-muted-foreground">Current rank</p>
            <p className="font-semibold">
              {rank != null ? (
                <span className="text-[oklch(0.445_0.107_195)]">#{rank}</span>
              ) : (
                "Not ranked"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Challenge categories */}
      <div className="divide-y">
        {CHALLENGE_CATEGORIES.map((category) => {
          const categoryActivities = category.activities.filter(
            (a) => challengeMap.has(a) && challengeMap.get(a)!.enabled
          );
          if (categoryActivities.length === 0) return null;

          return (
            <div key={category.name} className="px-4 py-3">
              <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">
                {category.name}
              </h4>
              <div className="space-y-1">
                <div className="flex text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span className="flex-1">Challenges</span>
                  <span className="w-20 text-right">Earned</span>
                  <span className="w-16 text-right">Max</span>
                </div>
                {categoryActivities.map((activityType) => {
                  const challenge = challengeMap.get(activityType)!;
                  const label = ACTIVITY_LABELS[activityType] ?? activityType;
                  const link = CHALLENGE_LINKS[activityType];

                  return (
                    <div key={activityType} className="flex items-center text-sm">
                      <span className="flex-1 truncate">
                        {link ? (
                          <Link
                            href={`${basePath}${link}`}
                            className="text-[oklch(0.445_0.107_195)] hover:underline"
                          >
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                      </span>
                      <span className="w-20 text-right text-muted-foreground">
                        {challenge.count * challenge.pointsPerAction}
                      </span>
                      <span className="w-16 text-right text-muted-foreground">
                        {challenge.maxPerEvent != null
                          ? challenge.pointsPerAction * challenge.maxPerEvent
                          : `${challenge.pointsPerAction}+`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Social proof CTA */}
      <div className="border-t px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">
          Attendees are connecting, sharing, and learning — join in!
        </p>
        <Link
          href={`${basePath}/community`}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[oklch(0.445_0.107_195)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[oklch(0.445_0.107_195)]/90 transition-colors"
        >
          Join in
        </Link>
      </div>
    </div>
  );
}
