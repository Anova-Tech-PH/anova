import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeakerProfileModal, type SpeakerForModal } from "./speaker-profile-modal";

vi.mock("@attendly/ui/components", () => ({
  ModalOverlay: ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
    <div data-testid="modal-overlay" onClick={onClose}>{children}</div>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("../public-actions", () => ({
  toggleSpeakerBookmark: vi.fn(),
  saveSpeakerNote: vi.fn(),
}));

vi.mock("../../messaging/actions", () => ({
  sendMessage: vi.fn(),
}));

const baseSpeaker: SpeakerForModal = {
  id: "speaker-1",
  name: "Jane Doe",
  title: "CTO",
  company: "Acme Corp",
  bio: "An experienced leader in technology.",
  photo: "https://example.com/photo.jpg",
  user_id: "user-123",
  sessions: [
    {
      id: "session-1",
      title: "Intro to AI",
      start_time: "2026-09-01T10:00:00Z",
      end_time: "2026-09-01T11:00:00Z",
    },
    {
      id: "session-2",
      title: "Advanced ML",
      start_time: "2026-09-02T14:00:00Z",
      end_time: "2026-09-02T15:00:00Z",
    },
  ],
};

const defaultProps = {
  speaker: baseSpeaker,
  eventId: "event-1",
  isBookmarked: false,
  noteContent: "",
  isLoggedIn: true,
  onClose: vi.fn(),
  basePath: "/events/event-1/speakers",
};

describe("SpeakerProfileModal", () => {
  it("renders speaker name and title", () => {
    render(<SpeakerProfileModal {...defaultProps} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/CTO/)).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it("renders session links in Speaking at section", () => {
    render(<SpeakerProfileModal {...defaultProps} />);
    expect(screen.getByText("Speaking at")).toBeInTheDocument();
    expect(screen.getByText("Intro to AI")).toBeInTheDocument();
    expect(screen.getByText("Advanced ML")).toBeInTheDocument();
  });

  it("renders bio in About section", () => {
    render(<SpeakerProfileModal {...defaultProps} />);
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("An experienced leader in technology.")).toBeInTheDocument();
  });

  it("shows Take Notes, Say Hi!, Bookmark buttons when logged in", () => {
    render(<SpeakerProfileModal {...defaultProps} />);
    expect(screen.getByRole("button", { name: /take notes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /say hi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bookmark/i })).toBeInTheDocument();
  });

  it("hides Say Hi! when speaker has no user_id", () => {
    const speakerNoUser = { ...baseSpeaker, user_id: null };
    render(<SpeakerProfileModal {...defaultProps} speaker={speakerNoUser} />);
    expect(screen.getByRole("button", { name: /take notes/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /say hi/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bookmark/i })).toBeInTheDocument();
  });

  it("hides action buttons when not logged in", () => {
    render(<SpeakerProfileModal {...defaultProps} isLoggedIn={false} />);
    expect(screen.queryByRole("button", { name: /take notes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /say hi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bookmark/i })).not.toBeInTheDocument();
  });

  it("shows Bookmarked state when isBookmarked is true", () => {
    render(<SpeakerProfileModal {...defaultProps} isBookmarked={true} />);
    expect(screen.getByRole("button", { name: /bookmarked/i })).toBeInTheDocument();
  });
});
