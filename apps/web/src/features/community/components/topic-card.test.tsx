import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicCard, type TopicCardData } from "./topic-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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

vi.mock("@/features/community/actions", () => ({
  toggleFollow: vi.fn().mockResolvedValue(undefined),
}));

const baseTopic: TopicCardData = {
  id: "topic-1",
  event_id: "event-1",
  author_id: "user-1",
  title: "Test Topic",
  type: "discussion",
  description: "A test description",
  pinned: false,
  meetup_date: null,
  meetup_location: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  post_count: 5,
  follower_count: 3,
  is_following: false,
};

describe("TopicCard", () => {
  it("shows unread indicator when has_unread is true", () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, has_unread: true }}
        basePath="/community"
      />
    );
    expect(screen.getByLabelText("Unread")).toBeDefined();
  });

  it("does not show unread indicator when has_unread is false", () => {
    render(
      <TopicCard
        topic={{ ...baseTopic, has_unread: false }}
        basePath="/community"
      />
    );
    expect(screen.queryByLabelText("Unread")).toBeNull();
  });

  it("does not show unread indicator when has_unread is undefined", () => {
    render(<TopicCard topic={baseTopic} basePath="/community" />);
    expect(screen.queryByLabelText("Unread")).toBeNull();
  });
});
