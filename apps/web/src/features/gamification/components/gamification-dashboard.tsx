"use client";

import { useState } from "react";
import { GamificationSetup } from "./gamification-setup";
import { LeaderboardView } from "./leaderboard-view";
import { BadgeManager } from "./badge-manager";
import type { GamificationConfig, PointRule, LeaderboardEntry, BadgeDefinition } from "@/features/gamification/queries";
import { cn } from "@attendly/ui/cn";

const TABS = [
  { id: "setup", label: "Setup" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "badges", label: "Badges" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function GamificationDashboard({
  eventId, config, rules, leaderboard, badges,
}: {
  eventId: string;
  config: GamificationConfig | null;
  rules: PointRule[];
  leaderboard: LeaderboardEntry[];
  badges: BadgeDefinition[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("setup");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Gamification</h1>
        <p className="text-sm text-muted-foreground">
          Boost engagement with points, leaderboards, and badges.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "setup" && <GamificationSetup eventId={eventId} config={config} rules={rules} />}
      {activeTab === "leaderboard" && <LeaderboardView eventId={eventId} entries={leaderboard} />}
      {activeTab === "badges" && <BadgeManager eventId={eventId} badges={badges} />}
    </div>
  );
}
