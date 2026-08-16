import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageInbox } from "./message-inbox";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const conversations = [
  {
    otherUserId: "user-1",
    lastMessage: "Hey there!",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
    profile: {
      id: "user-1",
      display_name: "Alice Smith",
      avatar_url: null,
      title: "Engineer",
      company: "Acme",
    },
  },
  {
    otherUserId: "user-2",
    lastMessage: "See you tomorrow",
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
    profile: {
      id: "user-2",
      display_name: "Bob Johnson",
      avatar_url: null,
      title: "Designer",
      company: "DesignCo",
    },
  },
  {
    otherUserId: "user-3",
    lastMessage: "Thanks!",
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 1,
    profile: {
      id: "user-3",
      display_name: "Charlie Brown",
      avatar_url: null,
      title: null,
      company: null,
    },
  },
];

describe("MessageInbox", () => {
  it("renders all conversations", () => {
    render(
      <MessageInbox
        eventId="event-1"
        conversations={conversations}
        onSelectConversation={vi.fn()}
      />
    );
    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Bob Johnson")).toBeDefined();
    expect(screen.getByText("Charlie Brown")).toBeDefined();
  });

  it("renders search input", () => {
    render(
      <MessageInbox
        eventId="event-1"
        conversations={conversations}
        onSelectConversation={vi.fn()}
      />
    );
    expect(
      screen.getByPlaceholderText("Search conversations...")
    ).toBeDefined();
  });

  it("filters conversations by name when searching", () => {
    render(
      <MessageInbox
        eventId="event-1"
        conversations={conversations}
        onSelectConversation={vi.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText("Search conversations...");
    fireEvent.change(searchInput, { target: { value: "alice" } });

    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.queryByText("Bob Johnson")).toBeNull();
    expect(screen.queryByText("Charlie Brown")).toBeNull();
  });

  it("shows empty state when search has no results", () => {
    render(
      <MessageInbox
        eventId="event-1"
        conversations={conversations}
        onSelectConversation={vi.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText("Search conversations...");
    fireEvent.change(searchInput, { target: { value: "zzzzz" } });

    expect(screen.queryByText("Alice Smith")).toBeNull();
    expect(screen.getByText(/no conversations match/i)).toBeDefined();
  });

  it("shows unread badge for conversations with unread messages", () => {
    render(
      <MessageInbox
        eventId="event-1"
        conversations={conversations}
        onSelectConversation={vi.fn()}
      />
    );
    expect(screen.getByText("2")).toBeDefined();
  });
});
