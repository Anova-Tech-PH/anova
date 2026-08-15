import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import {
  SpeakersClientPage,
  type SpeakerWithSessions,
} from "./speakers-client-page";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@attendly/ui/components", () => ({
  ModalOverlay: ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) => (
    <div data-testid="modal-overlay" onClick={onClose}>
      {children}
    </div>
  ),
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("../public-actions", () => ({
  toggleSpeakerBookmark: vi.fn(),
  saveSpeakerNote: vi.fn(),
}));

vi.mock("../../messaging/actions", () => ({
  sendMessage: vi.fn(),
}));

const speakers: SpeakerWithSessions[] = [
  {
    id: "spk1",
    name: "Alice Smith",
    title: "Engineer",
    company: "Acme",
    bio: "Bio 1",
    photo: null,
    user_id: null,
    is_featured: false,
    sessions: [
      {
        id: "s1",
        title: "Session A",
        start_time: "2025-11-03T10:00:00Z",
        end_time: "2025-11-03T11:00:00Z",
        tracks: [{ name: "AI", color: "#ff0000" }],
      },
    ],
  },
  {
    id: "spk2",
    name: "Bob Jones",
    title: "Designer",
    company: "DesignCo",
    bio: "Bio 2",
    photo: null,
    user_id: "u2",
    is_featured: true,
    sessions: [
      {
        id: "s2",
        title: "Session B",
        start_time: "2025-11-04T14:00:00Z",
        end_time: "2025-11-04T15:00:00Z",
        tracks: [{ name: "Design", color: "#0000ff" }],
      },
    ],
  },
];

const defaultProps = {
  speakers,
  eventTitle: "Test Event",
  eventId: "evt1",
  basePath: "/org/event",
  isLoggedIn: false,
  bookmarkedSpeakerIds: [],
  speakerNotes: {},
};

describe("SpeakersClientPage", () => {
  it("renders hero banner with title and speaker count", () => {
    render(<SpeakersClientPage {...defaultProps} />);
    expect(screen.getByText("Meet Our Speakers")).toBeInTheDocument();
    expect(screen.getByText(/2 speakers/i)).toBeInTheDocument();
  });

  it("renders all speaker cards with names", () => {
    render(<SpeakersClientPage {...defaultProps} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("filters speakers by search text", async () => {
    const user = userEvent.setup();
    render(<SpeakersClientPage {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/Search name/i);
    await user.type(searchInput, "Alice");
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
  });

  it("filters by day dropdown", async () => {
    const user = userEvent.setup();
    render(<SpeakersClientPage {...defaultProps} />);
    const daySelect = screen.getByLabelText("Speaking on");
    // Select the day that Alice's session is on (Nov 3)
    await user.selectOptions(daySelect, "2025-11-03");
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
  });

  it("filters by category/track dropdown", async () => {
    const user = userEvent.setup();
    render(<SpeakersClientPage {...defaultProps} />);
    const catSelect = screen.getByLabelText("Categories");
    await user.selectOptions(catSelect, "Design");
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
  });

  it("resets filters", async () => {
    const user = userEvent.setup();
    render(<SpeakersClientPage {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/Search name/i);
    await user.type(searchInput, "Alice");
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    const resetBtn = screen.getByRole("button", { name: /Reset filters/i });
    await user.click(resetBtn);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("opens speaker modal on View Profile click", async () => {
    const user = userEvent.setup();
    render(<SpeakersClientPage {...defaultProps} />);
    const viewButtons = screen.getAllByRole("button", {
      name: /View Profile/i,
    });
    await user.click(viewButtons[0]);
    expect(screen.getByText("Speaking at")).toBeInTheDocument();
  });
});
