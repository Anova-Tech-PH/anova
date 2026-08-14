import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MeetupsPageClient } from "./meetups-page-client";

vi.mock("@/features/meetups/actions", () => ({
  createMeetup: vi.fn(),
  updateMeetup: vi.fn(),
  deleteMeetup: vi.fn(),
}));

vi.mock("@attendly/ui/components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@attendly/ui/components"
  );
  return {
    ...actual,
    ModalOverlay: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <div data-testid="modal-overlay" onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}>
        {children}
      </div>
    ),
    useConfirm: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      dialog: null,
    }),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const meetups = [
  {
    id: "meetup-1",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Prayer Evangelism",
    description: "Evening prayer",
    starts_at: "2025-11-01T20:00:00Z",
    ends_at: null,
    location: "Room B",
    capacity: null,
    status: "active" as const,
    rsvp_count: 27,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
  {
    id: "meetup-2",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Networking Lunch",
    description: null,
    starts_at: "2025-11-02T12:00:00Z",
    ends_at: "2025-11-02T13:00:00Z",
    location: null,
    capacity: 50,
    status: "active" as const,
    rsvp_count: 34,
    created_at: "2025-10-02T00:00:00Z",
    updated_at: "2025-10-02T00:00:00Z",
  },
];

const defaultProps = {
  eventId: "evt-1",
  meetups,
  total: 2,
  page: 1,
  pageSize: 20,
};

describe("MeetupsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Meet-ups" })).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(
      screen.getByText(/post your meet-ups/i)
    ).toBeInTheDocument();
  });

  it("renders Create meet-up button", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /create meet-up/i })
    ).toBeInTheDocument();
  });

  it("renders From other organizers button", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /from other organizers/i })
    ).toBeInTheDocument();
  });

  it("renders all meetup cards", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(screen.getByText("Prayer Evangelism")).toBeInTheDocument();
    expect(screen.getByText("Networking Lunch")).toBeInTheDocument();
  });

  it("opens composer when Create meet-up is clicked", async () => {
    const user = userEvent.setup();
    render(<MeetupsPageClient {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /create meet-up/i }));
    expect(screen.getByText("New Meet-up")).toBeInTheDocument();
  });

  it("shows empty state when no meetups", () => {
    render(<MeetupsPageClient {...defaultProps} meetups={[]} total={0} />);
    expect(
      screen.getByText(/no meet-ups yet/i)
    ).toBeInTheDocument();
  });

  it("shows stats card with total count", () => {
    render(<MeetupsPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
