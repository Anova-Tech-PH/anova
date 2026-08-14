"use client";

import type { BadgeDefinition, UserBadge } from "@/features/gamification/queries";

export function BadgeGrid({
  allBadges,
  earnedBadges,
}: {
  allBadges: BadgeDefinition[];
  earnedBadges: UserBadge[];
}) {
  const earnedIds = new Set(earnedBadges.map((b) => b.badge_id));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        Badges ({earnedBadges.length}/{allBadges.length})
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {allBadges.map((badge) => {
          const earned = earnedIds.has(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                earned ? "bg-card" : "bg-muted/30 opacity-50"
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-medium">{badge.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {earned ? "Earned!" : badge.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
