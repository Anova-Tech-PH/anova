import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MeetupComposer } from "./meetup-composer";

vi.mock("@/features/meetups/actions", () => ({
  createMeetup: vi.fn(),
  updateMeetup: vi.fn(),
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
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
};

describe("MeetupComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<MeetupComposer {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("New Meet-up")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<MeetupComposer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders title input", () => {
    render(<MeetupComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/meet-up title/i)).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<MeetupComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/describe your meet-up/i)).toBeInTheDocument();
  });

  it("renders date and time inputs", () => {
    render(<MeetupComposer {...defaultProps} />);
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
  });

  it("renders location and capacity inputs", () => {
    render(<MeetupComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/room or venue/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/unlimited/i)).toBeInTheDocument();
  });

  it("Create button is disabled when title is empty", () => {
    render(<MeetupComposer {...defaultProps} />);
    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it("Create button is enabled when title has text", async () => {
    const user = userEvent.setup();
    render(<MeetupComposer {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/meet-up title/i), "Prayer Time");

    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).not.toBeDisabled();
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MeetupComposer {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows Edit Meet-up when editing", () => {
    const draft = {
      id: "meetup-1",
      event_id: "evt-1",
      created_by: "user-1",
      title: "Existing Meetup",
      description: "Some description",
      starts_at: "2025-11-02T18:00:00Z",
      ends_at: null,
      location: "Room A",
      capacity: 50,
      status: "active" as const,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    render(<MeetupComposer {...defaultProps} draft={draft} />);
    expect(screen.getByText("Edit Meet-up")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/meet-up title/i)).toHaveValue("Existing Meetup");
  });
});
