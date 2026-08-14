import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { GroupDetailPageClient } from "./group-detail-page-client";

vi.mock("@/features/social-groups/actions", () => ({
  deleteGroupPost: vi.fn(),
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const group = {
  id: "group-1",
  event_id: "evt-1",
  created_by: "user-1",
  title: "Parents with Kids",
  description: "A group for parents",
  prompt: "What ages are your kids?",
  is_visible: true,
  sort_order: 0,
  member_count: 2,
  post_count: 1,
  created_at: "2025-10-01T00:00:00Z",
  updated_at: "2025-10-01T00:00:00Z",
};

const posts = [
  {
    id: "post-1",
    group_id: "group-1",
    user_id: "user-2",
    content: "My kids are 5 and 8!",
    created_at: "2025-10-02T00:00:00Z",
    updated_at: "2025-10-02T00:00:00Z",
    author_name: "Jane Doe",
    author_email: "jane@test.com",
    comment_count: 3,
  },
];

const members = [
  {
    user_id: "user-2",
    joined_at: "2025-10-01T12:00:00Z",
    profiles: { full_name: "Jane Doe", email: "jane@test.com" },
  },
  {
    user_id: "user-3",
    joined_at: "2025-10-02T12:00:00Z",
    profiles: { full_name: "John Smith", email: "john@test.com" },
  },
];

const defaultProps = {
  eventId: "evt-1",
  group,
  posts,
  members,
};

describe("GroupDetailPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders group title", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: "Parents with Kids" })
    ).toBeInTheDocument();
  });

  it("renders group description", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(screen.getByText("A group for parents")).toBeInTheDocument();
  });

  it("renders group prompt", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(screen.getByText(/what ages are your kids/i)).toBeInTheDocument();
  });

  it("renders back link to social groups", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    const backLink = screen.getByRole("link", { name: /back to social groups/i });
    expect(backLink).toHaveAttribute("href", "/events/evt-1/social-groups");
  });

  it("renders member and post stats cards", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    // "Members" appears in both stats card and section heading
    expect(screen.getAllByText("Members").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1")).toBeInTheDocument();
    // "Posts" appears in both stats card and section heading
    expect(screen.getAllByText("Posts").length).toBeGreaterThanOrEqual(2);
  });

  it("renders member names in table", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    // Jane Doe appears in members table + posts section
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("renders post content", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(screen.getByText("My kids are 5 and 8!")).toBeInTheDocument();
  });

  it("renders post author name", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    // Jane Doe appears in both members and posts
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThanOrEqual(1);
  });

  it("renders comment count on posts", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(screen.getByText("3 comments")).toBeInTheDocument();
  });

  it("shows empty state for members when none", () => {
    render(
      <GroupDetailPageClient
        {...defaultProps}
        members={[]}
        group={{ ...group, member_count: 0 }}
      />
    );
    expect(
      screen.getByText(/no members have joined/i)
    ).toBeInTheDocument();
  });

  it("shows empty state for posts when none", () => {
    render(
      <GroupDetailPageClient
        {...defaultProps}
        posts={[]}
        group={{ ...group, post_count: 0 }}
      />
    );
    expect(
      screen.getByText(/no posts in this group/i)
    ).toBeInTheDocument();
  });

  it("renders delete button on posts", () => {
    render(<GroupDetailPageClient {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /delete post/i })
    ).toBeInTheDocument();
  });
});
