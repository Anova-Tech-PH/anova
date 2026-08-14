import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { SocialGroupsPageClient } from "./social-groups-page-client";

vi.mock("@/features/social-groups/actions", () => ({
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
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

const groups = [
  {
    id: "group-1",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Parents with Kids",
    description: "A group for parents attending with children",
    is_visible: true,
    sort_order: 0,
    created_at: "2025-10-01T00:00:00Z",
    updated_at: "2025-10-01T00:00:00Z",
  },
  {
    id: "group-2",
    event_id: "evt-1",
    created_by: "user-1",
    title: "Remote Workers",
    description: null,
    is_visible: true,
    sort_order: 1,
    created_at: "2025-10-02T00:00:00Z",
    updated_at: "2025-10-02T00:00:00Z",
  },
];

const defaultProps = {
  eventId: "evt-1",
  groups,
  total: 2,
};

describe("SocialGroupsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Social Groups" })
    ).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    expect(
      screen.getByText(/creating small groups/i)
    ).toBeInTheDocument();
  });

  it("renders Create group button", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /create group/i })
    ).toBeInTheDocument();
  });

  it("renders From other organizers button as disabled", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    const btn = screen.getByRole("button", {
      name: /from other organizers/i,
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("renders Reuse past group button as disabled", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /reuse past group/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("renders group titles", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    expect(screen.getByText("Parents with Kids")).toBeInTheDocument();
    expect(screen.getByText("Remote Workers")).toBeInTheDocument();
  });

  it("shows empty state when no groups", () => {
    render(
      <SocialGroupsPageClient
        {...defaultProps}
        groups={[]}
        total={0}
      />
    );
    expect(
      screen.getByText(/what do your attendees have in common/i)
    ).toBeInTheDocument();
  });

  it("shows stats card with total count", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("opens composer when Create group is clicked", async () => {
    const user = userEvent.setup();
    render(<SocialGroupsPageClient {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /create group/i })
    );
    expect(screen.getByText("New Group")).toBeInTheDocument();
  });

  it("renders Edit and Delete buttons for groups", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it("renders Download all posts button as disabled", () => {
    render(<SocialGroupsPageClient {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /download all posts/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });
});
