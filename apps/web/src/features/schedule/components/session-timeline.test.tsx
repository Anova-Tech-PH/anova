import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock server actions
vi.mock("../actions", () => ({
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock useConfirm
vi.mock("@attendly/ui/components", async () => {
  const actual = await vi.importActual("@attendly/ui/components");
  return {
    ...actual,
    useConfirm: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      dialog: null,
    }),
  };
});

import { SessionTimeline } from "./session-timeline";

const makeSessions = () => [
  {
    id: "s1",
    title: "Opening Keynote",
    description: null,
    type: "keynote",
    start_time: "2026-09-11T09:00:00Z",
    end_time: "2026-09-11T10:00:00Z",
    location: "Main Hall",
    enable_check_in: false,
    rsvp_enabled: false,
    capacity: null,
    track: { id: "t1", name: "Main Stage", color: "#3b82f6" },
    session_speakers: [],
  },
  {
    id: "s2",
    title: "Workshop A",
    description: null,
    type: "workshop",
    start_time: "2026-09-11T14:00:00Z",
    end_time: "2026-09-11T15:00:00Z",
    location: "Room B",
    enable_check_in: false,
    rsvp_enabled: false,
    capacity: null,
    track: null,
    session_speakers: [],
  },
  {
    id: "s3",
    title: "Day 2 Talk",
    description: null,
    type: "talk",
    start_time: "2026-09-12T10:00:00Z",
    end_time: "2026-09-12T11:00:00Z",
    location: "Room A",
    enable_check_in: false,
    rsvp_enabled: false,
    capacity: null,
    track: null,
    session_speakers: [],
  },
];

describe("SessionTimeline", () => {
  const defaultProps = {
    eventId: "evt-1",
    tracks: [{ id: "t1", name: "Main Stage", color: "#3b82f6" }],
    speakers: [],
  };

  it("renders date tabs for multi-day events", () => {
    render(
      <SessionTimeline {...defaultProps} initialSessions={makeSessions()} />
    );
    // Should have date tab buttons for Sep 11 and Sep 12
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(2);
  });

  it("shows first day sessions by default", () => {
    render(
      <SessionTimeline {...defaultProps} initialSessions={makeSessions()} />
    );
    expect(screen.getByText("Opening Keynote")).toBeInTheDocument();
    expect(screen.getByText("Workshop A")).toBeInTheDocument();
    expect(screen.queryByText("Day 2 Talk")).not.toBeInTheDocument();
  });

  it("switches day when clicking a date tab", () => {
    render(
      <SessionTimeline {...defaultProps} initialSessions={makeSessions()} />
    );
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // Click second day tab

    expect(screen.queryByText("Opening Keynote")).not.toBeInTheDocument();
    expect(screen.getByText("Day 2 Talk")).toBeInTheDocument();
  });

  it("marks the active date tab as selected", () => {
    render(
      <SessionTimeline {...defaultProps} initialSessions={makeSessions()} />
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("does not show date tabs for single-day events", () => {
    const singleDaySessions = makeSessions().filter(
      (s) => s.start_time.startsWith("2026-09-11")
    );
    render(
      <SessionTimeline {...defaultProps} initialSessions={singleDaySessions} />
    );
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("renders empty state when no sessions", () => {
    render(<SessionTimeline {...defaultProps} initialSessions={[]} />);
    expect(screen.getByText("No sessions")).toBeInTheDocument();
  });

  it("shows session count for selected day", () => {
    render(
      <SessionTimeline {...defaultProps} initialSessions={makeSessions()} />
    );
    expect(screen.getByText(/2 session/)).toBeInTheDocument();
  });
});
