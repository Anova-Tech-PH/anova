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

const baseEntry = {
  user_id: "u1",
  total_points: 100,
  challenges_completed: 3,
  last_activity_at: null,
  rank: 1,
  full_name: "Alice Smith",
  avatar_url: "https://example.com/alice.jpg",
};

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
    const button = screen.getByRole("button", { name: /Congratulate/ });
    expect(button).toBeDefined();
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
    const buttons = container.querySelectorAll("button");
    const congratButtons = Array.from(buttons).filter(
      (b) => b.textContent?.includes("Congratulate")
    );
    expect(congratButtons).toHaveLength(1);
  });
});

describe("LeaderboardFull avatars", () => {
  it("renders avatar for each leaderboard entry", () => {
    render(
      <LeaderboardFull
        entries={[baseEntry]}
        currentUserId={null}
        userRank={null}
        userPoints={null}
        title="Leaderboard"
        eventId="e1"
      />
    );

    const img = screen.getByAltText("Alice Smith");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/alice.jpg");
  });

  it("renders initials when avatar_url is null", () => {
    render(
      <LeaderboardFull
        entries={[{ ...baseEntry, avatar_url: null }]}
        currentUserId={null}
        userRank={null}
        userPoints={null}
        title="Leaderboard"
        eventId="e1"
      />
    );

    expect(screen.getByText("AS")).toBeDefined();
  });
});

describe("LeaderboardFull social prompt", () => {
  it("renders social prompt when entries exist", () => {
    render(
      <LeaderboardFull
        entries={[baseEntry]}
        currentUserId="u2"
        userRank={2}
        userPoints={50}
        title="Leaderboard"
        eventId="e1"
      />
    );

    expect(screen.getByText(/Congratulate the most active members/)).toBeDefined();
  });

  it("does not render social prompt when no entries", () => {
    render(
      <LeaderboardFull
        entries={[]}
        currentUserId={null}
        userRank={null}
        userPoints={null}
        title="Leaderboard"
        eventId="e1"
      />
    );

    expect(screen.queryByText(/Congratulate the most active members/)).toBeNull();
  });
});
