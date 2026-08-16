import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicDetail } from "./topic-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
  createPost: vi.fn().mockResolvedValue(undefined),
  toggleReaction: vi.fn().mockResolvedValue(undefined),
  markTopicRead: vi.fn().mockResolvedValue(undefined),
}));

const baseTopic = {
  id: "topic-1",
  event_id: "event-1",
  author_id: "user-1",
  title: "Hello World",
  type: "discussion" as const,
  description: "A discussion topic",
  pinned: false,
  meetup_date: null,
  meetup_location: null,
  created_at: "2026-01-01T00:00:00Z",
  author: { display_name: "Alice", avatar_url: null },
  posts: [
    {
      id: "post-1",
      author_id: "user-2",
      content: "First reply!",
      created_at: "2026-01-02T00:00:00Z",
      attendee_profiles: { display_name: "Bob", avatar_url: null },
      reactions: { "👍": 2, "❤": 1, "🤣": 0 },
      user_reactions: ["👍"],
    },
  ],
  is_following: false,
};

describe("TopicDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders topic title and description", () => {
    render(<TopicDetail topic={baseTopic} backPath="/community" />);
    expect(screen.getByText("Hello World")).toBeDefined();
    expect(screen.getByText("A discussion topic")).toBeDefined();
  });

  it("renders posts with content", () => {
    render(<TopicDetail topic={baseTopic} backPath="/community" />);
    expect(screen.getByText("First reply!")).toBeDefined();
  });

  it("renders emoji reaction buttons on posts", () => {
    render(<TopicDetail topic={baseTopic} backPath="/community" />);
    expect(screen.getByRole("button", { name: /👍/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /❤/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /🤣/ })).toBeDefined();
  });

  it("shows reaction count when > 0", () => {
    render(<TopicDetail topic={baseTopic} backPath="/community" />);
    const thumbsUp = screen.getByRole("button", { name: /👍/ });
    expect(thumbsUp.textContent).toContain("2");
  });

  it("highlights user's own reactions", () => {
    render(<TopicDetail topic={baseTopic} backPath="/community" />);
    const thumbsUp = screen.getByRole("button", { name: /👍/ });
    expect(thumbsUp.className).toContain("bg-blue");
  });
});
