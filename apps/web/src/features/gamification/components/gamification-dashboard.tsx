"use client";

import { useState } from "react";
import { GamificationSetup } from "./gamification-setup";
import { LeaderboardView } from "./leaderboard-view";
import { BadgeManager } from "./badge-manager";
import { ContestManager } from "./contest-manager";
import { TriviaManager } from "./trivia-manager";
import { PassportManager } from "./passport-manager";
import { ReferralStats } from "./referral-stats";
import type { GamificationConfig, PointRule, LeaderboardEntry, BadgeDefinition } from "@/features/gamification/queries";
import type { Contest } from "@/features/gamification/contest-queries";
import type { TriviaGame } from "@/features/gamification/trivia-queries";
import { cn } from "@attendly/ui/cn";

const TABS = [
  { id: "setup", label: "Setup" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "badges", label: "Badges" },
  { id: "contests", label: "Contests" },
  { id: "trivia", label: "Trivia" },
  { id: "passport", label: "Passport" },
  { id: "referrals", label: "Referrals" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function GamificationDashboard({
  eventId,
  config,
  rules,
  leaderboard,
  badges,
  contests,
  triviaGames,
  sponsors,
  referralStats,
  orgSlug,
  eventSlug,
}: {
  eventId: string;
  config: GamificationConfig | null;
  rules: PointRule[];
  leaderboard: LeaderboardEntry[];
  badges: BadgeDefinition[];
  contests?: Contest[];
  triviaGames?: TriviaGame[];
  sponsors?: { id: string; name: string; logo_url: string | null }[];
  referralStats?: { user_id: string; code: string; registrations_count: number; full_name: string | null }[];
  orgSlug?: string;
  eventSlug?: string;
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

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
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
      {activeTab === "contests" && <ContestManager eventId={eventId} contests={contests ?? []} />}
      {activeTab === "trivia" && <TriviaManager eventId={eventId} games={triviaGames ?? []} />}
      {activeTab === "passport" && <PassportManager eventId={eventId} sponsors={sponsors ?? []} orgSlug={orgSlug ?? ""} eventSlug={eventSlug ?? ""} />}
      {activeTab === "referrals" && <ReferralStats stats={referralStats ?? []} />}
    </div>
  );
}
