import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MeetupCard } from "./meetup-card";

vi.mock("@/features/meetups/actions", () => ({
  deleteMeetup: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@attendly/ui/components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@attendly/ui/components"
  );
  return {
    ...actual,
    useConfirm: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      dialog: null,
    }),
  };
});

const meetup = {
  id: "meetup-1",
  event_id: "evt-1",
  created_by: "user-1",
  title: "Prayer Evangelism",
  description: "Meeting to pray every evening during the conference",
  starts_at: "2025-11-01T20:00:00Z",
  ends_at: null,
  location: "Room B",
  capacity: 30,
  status: "active" as const,
  rsvp_count: 27,
  created_at: "2025-10-01T00:00:00Z",
  updated_at: "2025-10-01T00:00:00Z",
};

const defaultProps = {
  meetup,
  eventId: "evt-1",
  onEdit: vi.fn(),
};

describe("MeetupCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders meetup title", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByText("Prayer Evangelism")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(
      screen.getByText("Meeting to pray every evening during the conference")
    ).toBeInTheDocument();
  });

  it("renders formatted date and time", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it("renders attendee count", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByText(/27 attending/)).toBeInTheDocument();
  });

  it("renders location", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByText("Room B")).toBeInTheDocument();
  });

  it("renders Send/Schedule Notifications button", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /send.*notification/i })
    ).toBeInTheDocument();
  });

  it("renders edit button and calls onEdit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<MeetupCard {...defaultProps} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(meetup);
  });

  it("renders delete button", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("shows capacity info when capacity is set", () => {
    render(<MeetupCard {...defaultProps} />);
    expect(screen.getByText(/27.*\/.*30/)).toBeInTheDocument();
  });
});
