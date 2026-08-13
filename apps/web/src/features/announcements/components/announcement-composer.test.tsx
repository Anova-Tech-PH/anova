import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AnnouncementComposer } from "./announcement-composer";

// Mock server actions
vi.mock("@/features/announcements/actions", () => ({
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  sendAnnouncement: vi.fn(),
  sendTestAnnouncement: vi.fn(),
}));

// Mock RichTextEditor since Tiptap requires browser APIs
vi.mock("@/shared/components/rich-text-editor", () => ({
  RichTextEditor: ({ content, onChange, placeholder }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

// Mock ModalOverlay to render children directly (avoids createPortal + mounted state issues)
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

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
  ticketTypes: [
    { id: "tt-1", name: "VIP" },
    { id: "tt-2", name: "General" },
  ],
  sessions: [
    { id: "sess-1", title: "Keynote" },
    { id: "sess-2", title: "Workshop" },
  ],
  categories: ["Speaker", "Sponsor"],
  totalAttendees: 42,
};

describe("AnnouncementComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("New Announcement")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<AnnouncementComposer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders subject input that accepts text", async () => {
    const user = userEvent.setup();
    render(<AnnouncementComposer {...defaultProps} />);

    const subjectInput = screen.getByPlaceholderText(/schedule update/i);
    expect(subjectInput).toBeInTheDocument();

    await user.type(subjectInput, "Hello World");
    expect(subjectInput).toHaveValue("Hello World");
  });

  it("renders rich text editor area", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/write your announcement/i)
    ).toBeInTheDocument();
  });

  it("renders 7 audience radio options", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(7);

    // Check key audience labels exist (use getAllByText where text overlaps)
    expect(screen.getByText("Specific attendee ticket type")).toBeInTheDocument();
    expect(screen.getByText("Specific attendee category")).toBeInTheDocument();
    expect(screen.getByText("Specific attendee segment")).toBeInTheDocument();
    expect(
      screen.getByText("Attendees who added a specific session")
    ).toBeInTheDocument();
    expect(screen.getByText("Manually add attendees")).toBeInTheDocument();
    expect(
      screen.getByText("All attendees except selected categories")
    ).toBeInTheDocument();
  });

  it("renders sender name and reply-to email fields", () => {
    render(<AnnouncementComposer {...defaultProps} />);

    expect(screen.getByText(/sender name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e\.g\. event team/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/reply-to email/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e\.g\. hello@example\.com/i)
    ).toBeInTheDocument();
  });

  it("renders channel checkboxes (In-App, Email, Push)", () => {
    render(<AnnouncementComposer {...defaultProps} />);

    const checkboxes = screen.getAllByRole("checkbox");
    // In-App, Email, Push are the channel checkboxes
    expect(screen.getByText("In-App")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Push Notification")).toBeInTheDocument();
  });

  it("has In-App channel checked by default", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    const inAppCheckbox = screen.getByLabelText(/in-app/i);
    expect(inAppCheckbox).toBeChecked();
  });

  it("Save draft button is disabled when subject is empty", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    const saveDraftButton = screen.getByRole("button", {
      name: /save draft/i,
    });
    expect(saveDraftButton).toBeDisabled();
  });

  it("Save draft button is enabled when subject has text", async () => {
    const user = userEvent.setup();
    render(<AnnouncementComposer {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText(/schedule update/i),
      "Test Subject"
    );

    const saveDraftButton = screen.getByRole("button", {
      name: /save draft/i,
    });
    expect(saveDraftButton).not.toBeDisabled();
  });

  it("Send button is disabled when subject is empty", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    const sendButton = screen.getByRole("button", { name: /^send$/i });
    expect(sendButton).toBeDisabled();
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AnnouncementComposer {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pre-fills form with draft data when editing", () => {
    const draft = {
      id: "ann-1",
      event_id: "evt-1",
      subject: "Draft Subject",
      body: "<p>Draft body content</p>",
      status: "draft" as const,
      target_audience: { type: "all" as const },
      channels: ["in_app", "email"],
      sender_name: "Custom Sender",
      reply_to_email: "reply@test.com",
      signature: null,
      sent_at: null,
      scheduled_for: null,
      read_count: 0,
      author_id: "user-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    render(<AnnouncementComposer {...defaultProps} draft={draft} />);

    // Should show "Edit Announcement" heading
    expect(screen.getByText("Edit Announcement")).toBeInTheDocument();

    // Subject should be pre-filled
    expect(screen.getByPlaceholderText(/schedule update/i)).toHaveValue(
      "Draft Subject"
    );

    // Body should be pre-filled in the mock editor
    expect(screen.getByTestId("rich-text-editor")).toHaveValue(
      "<p>Draft body content</p>"
    );

    // Sender name should be pre-filled
    expect(screen.getByPlaceholderText(/e\.g\. event team/i)).toHaveValue(
      "Custom Sender"
    );

    // Reply-to email should be pre-filled
    expect(
      screen.getByPlaceholderText(/e\.g\. hello@example\.com/i)
    ).toHaveValue("reply@test.com");

    // Email channel should be checked (draft has both in_app and email)
    const emailCheckbox = screen.getByLabelText(/email/i);
    expect(emailCheckbox).toBeChecked();
  });

  it("toggles email channel checkbox", async () => {
    const user = userEvent.setup();
    render(<AnnouncementComposer {...defaultProps} />);

    const emailCheckbox = screen.getByLabelText(/^email$/i);
    expect(emailCheckbox).not.toBeChecked();

    await user.click(emailCheckbox);
    expect(emailCheckbox).toBeChecked();
  });

  it("displays total attendees count next to All attendees option", () => {
    render(<AnnouncementComposer {...defaultProps} />);
    expect(screen.getByText("(42)")).toBeInTheDocument();
  });

  it("pre-fills sender_name and reply_to_email from template props (copy/duplicate flow)", () => {
    render(
      <AnnouncementComposer
        {...defaultProps}
        templateSubject="Copied Subject"
        templateBody="<p>Copied body</p>"
        templateSenderName="Org Sender"
        templateReplyToEmail="reply@org.com"
      />
    );

    expect(screen.getByPlaceholderText(/e\.g\. event team/i)).toHaveValue(
      "Org Sender"
    );
    expect(
      screen.getByPlaceholderText(/e\.g\. hello@example\.com/i)
    ).toHaveValue("reply@org.com");
  });
});
