import { Trophy } from "lucide-react";
import { Badge } from "@attendly/ui/components";

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <Trophy className="h-10 w-10 text-amber-600" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold">
        Gamification & Leaderboard
      </h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        Earn points by participating in sessions, polls, community discussions,
        and more. Compete with other attendees and win prizes!
      </p>
      <Badge variant="secondary" className="mt-4">
        Coming Soon
      </Badge>
    </div>
  );
}
