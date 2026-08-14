import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DiscussionTopicsPageClient } from "./discussion-topics-page-client";

vi.mock("@/features/discussion-topics/actions", () => ({
  createTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
  toggleTopicVisibility: vi.fn(),
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

const customTopics = [
  {
    id: "topic-1",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Worship Music Suggestions",
    description: "Share your favorite worship songs",
    is_built_in: false,
    built_in_key: null,
    is_visible: true,
    sort_order: 0,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
  {
    id: "topic-2",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Prayer Requests",
    description: null,
    is_built_in: false,
    built_in_key: null,
    is_visible: true,
    sort_order: 1,
    created_at: "2025-10-02T00:00:00Z",
    updated_at: "2025-10-02T00:00:00Z",
  },
];

const builtInTopics = [
  {
    id: "topic-bi-1",
    event_id: "evt-1",
    created_by: null,
    title: "Ask Organizers Anything",
    description: null,
    is_built_in: true,
    built_in_key: "ask_organizers",
    is_visible: true,
    sort_order: 0,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
  {
    id: "topic-bi-2",
    event_id: "evt-1",
    created_by: null,
    title: "Lost & Found",
    description: null,
    is_built_in: true,
    built_in_key: "lost_and_found",
    is_visible: false,
    sort_order: 2,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
];

const defaultProps = {
  eventId: "evt-1",
  customTopics,
  builtInTopics,
  total: 2,
};

describe("DiscussionTopicsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Discussion Topics" })
    ).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(
      screen.getByText(/create topics for your attendees to discuss/i)
    ).toBeInTheDocument();
  });

  it("renders Create topic button", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /create topic/i })
    ).toBeInTheDocument();
  });

  it("renders From other organizers button as disabled", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    const btn = screen.getByRole("button", {
      name: /from other organizers/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("renders Reuse past topic button as disabled", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /reuse past topic/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("renders custom topic titles", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(
      screen.getByText("Worship Music Suggestions")
    ).toBeInTheDocument();
    expect(screen.getByText("Prayer Requests")).toBeInTheDocument();
  });

  it("renders built-in topic titles", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(
      screen.getByText("Ask Organizers Anything")
    ).toBeInTheDocument();
    expect(screen.getByText("Lost & Found")).toBeInTheDocument();
  });

  it("shows empty state when no custom topics", () => {
    render(
      <DiscussionTopicsPageClient
        {...defaultProps}
        customTopics={[]}
        total={0}
      />
    );
    expect(
      screen.getByText(/no custom topics yet/i)
    ).toBeInTheDocument();
  });

  it("shows stats card with total count", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens composer when Create topic is clicked", async () => {
    const user = userEvent.setup();
    render(<DiscussionTopicsPageClient {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /create topic/i })
    );
    expect(screen.getByText("New Topic")).toBeInTheDocument();
  });

  it("renders Edit and Delete buttons for custom topics", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it("renders Hide buttons for visible built-in topics", () => {
    render(<DiscussionTopicsPageClient {...defaultProps} />);
    const hideButtons = screen.getAllByRole("button", { name: /hide/i });
    // One visible built-in topic should have "Hide", one hidden should have "Show"
    expect(hideButtons.length).toBeGreaterThanOrEqual(1);
  });
});
