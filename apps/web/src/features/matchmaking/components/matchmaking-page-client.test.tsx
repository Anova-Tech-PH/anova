import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MatchmakingPageClient } from "./matchmaking-page-client";

vi.mock("@/features/matchmaking/actions", () => ({
  createInterest: vi.fn(),
  updateInterest: vi.fn(),
  deleteInterest: vi.fn(),
  generateInterests: vi.fn(),
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

const interests = [
  {
    id: "int-1",
    event_id: "evt-1",
    name: "Artificial Intelligence",
    sort_order: 0,
    attendee_count: 15,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
  {
    id: "int-2",
    event_id: "evt-1",
    name: "Sustainability",
    sort_order: 1,
    attendee_count: 8,
    created_at: "2025-10-02T00:00:00Z",
    updated_at: "2025-10-02T00:00:00Z",
  },
];

const defaultProps = {
  eventId: "evt-1",
  interests,
  total: 2,
  attendeesParticipating: 20,
};

describe("MatchmakingPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Attendee Matchmaking" })
    ).toBeInTheDocument();
  });

  it("renders stats card with interest count", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Interests Defined")).toBeInTheDocument();
  });

  it("renders stats card with attendee count", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(
      screen.getByText("Attendees Participating")
    ).toBeInTheDocument();
  });

  it("renders interest names in table", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(
      screen.getByText("Artificial Intelligence")
    ).toBeInTheDocument();
    expect(screen.getByText("Sustainability")).toBeInTheDocument();
  });

  it("renders attendee counts per interest", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("15 attendees")).toBeInTheDocument();
    expect(screen.getByText("8 attendees")).toBeInTheDocument();
  });

  it("renders Add interest button", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /add interest/i })
    ).toBeInTheDocument();
  });

  it("renders Generate interests button", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /generate interests/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when no interests", () => {
    render(
      <MatchmakingPageClient
        {...defaultProps}
        interests={[]}
        total={0}
        attendeesParticipating={0}
      />
    );
    expect(
      screen.getByText(/help attendees find others with similar passions!/i)
    ).toBeInTheDocument();
  });

  it("renders Edit and Delete buttons for each interest", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete/i,
    });
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it("opens composer when Add interest is clicked", async () => {
    const user = userEvent.setup();
    render(<MatchmakingPageClient {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /add interest/i })
    );
    expect(screen.getByText("New Interest")).toBeInTheDocument();
  });
});
