import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeaderboardFull } from "./leaderboard-full";

vi.mock("@attendly/ui/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  }),
}));

vi.mock("../congratulation-actions", () => ({
  toggleCongratulation: vi.fn(),
}));

describe("LeaderboardFull with congratulations", () => {
  const entries = [
    { user_id: "user-1", total_points: 100, challenges_completed: 3, last_activity_at: null, rank: 1, full_name: "Alice", avatar_url: null },
    { user_id: "user-2", total_points: 80, challenges_completed: 2, last_activity_at: null, rank: 2, full_name: "Bob", avatar_url: null },
  ];

  it("renders congratulate buttons for other users when logged in", () => {
    render(
      <LeaderboardFull
        entries={entries}
        currentUserId="user-1"
        userRank={1}
        userPoints={100}
        title="Leaderboard"
        eventId="event-1"
        congratulationCounts={{ "user-2": 5 }}
        userCongratulations={[]}
      />
    );
    expect(screen.getByText(/Congratulate/)).toBeDefined();
  });

  it("shows Congratulated state for already-congratulated users", () => {
    render(
      <LeaderboardFull
        entries={entries}
        currentUserId="user-1"
        userRank={1}
        userPoints={100}
        title="Leaderboard"
        eventId="event-1"
        congratulationCounts={{ "user-2": 3 }}
        userCongratulations={["user-2"]}
      />
    );
    expect(screen.getByText(/Congratulated/)).toBeDefined();
  });

  it("does not show congratulate button for yourself", () => {
    const { container } = render(
      <LeaderboardFull
        entries={entries}
        currentUserId="user-1"
        userRank={1}
        userPoints={100}
        title="Leaderboard"
        eventId="event-1"
        congratulationCounts={{}}
        userCongratulations={[]}
      />
    );
    // Only one congratulate button (for Bob), not for Alice
    const buttons = container.querySelectorAll("button");
    const congratButtons = Array.from(buttons).filter(
      (b) => b.textContent?.includes("Congratulate")
    );
    expect(congratButtons).toHaveLength(1);
  });
});
