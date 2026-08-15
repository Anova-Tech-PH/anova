import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionCommunityPreview } from "./session-community-preview";

describe("SessionCommunityPreview", () => {
  const defaultProps = {
    topics: [
      {
        id: "t1",
        title: "Organizer Announcements",
        type: "announcement" as const,
        description: "Check all announcements sent by the organizer",
        post_count: 49,
        pinned: true,
      },
      {
        id: "t2",
        title: "Meet-ups & Virtual Meets",
        type: "meetup" as const,
        description: "Suggest a dinner together",
        post_count: 54,
        pinned: false,
      },
    ],
    communityUrl: "/org/event/community",
    totalCount: 104,
  };

  it("renders topic titles", () => {
    render(<SessionCommunityPreview {...defaultProps} />);
    expect(screen.getByText("Organizer Announcements")).toBeInTheDocument();
    expect(screen.getByText("Meet-ups & Virtual Meets")).toBeInTheDocument();
  });

  it("shows total count", () => {
    render(<SessionCommunityPreview {...defaultProps} />);
    expect(screen.getByText(/104 topics/)).toBeInTheDocument();
  });

  it("renders View all link to community page", () => {
    render(<SessionCommunityPreview {...defaultProps} />);
    const link = screen.getByText("View all").closest("a");
    expect(link).toHaveAttribute("href", "/org/event/community");
  });

  it("shows empty state when no topics", () => {
    render(
      <SessionCommunityPreview
        topics={[]}
        communityUrl="/org/event/community"
        totalCount={0}
      />
    );
    expect(screen.getByText(/No community topics yet/)).toBeInTheDocument();
  });
});
