import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/messaging/actions", () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
  markMessagesRead: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
const { MessagesView } = await import(
  "@/app/(public)/[orgSlug]/[eventSlug]/messages/messages-view"
);

const conversations = [
  {
    otherUserId: "user-1",
    lastMessage: "Hey!",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    profile: {
      id: "user-1",
      display_name: "Alice",
      avatar_url: null,
      title: null,
      company: null,
    },
  },
];

const attendees = [
  {
    id: "user-2",
    display_name: "Bob",
    avatar_url: null,
    title: "Engineer",
    company: "Acme",
  },
];

describe("MessagesView", () => {
  it("renders conversation list", () => {
    render(
      <MessagesView
        eventId="event-1"
        currentUserId="me"
        basePath="/org/event"
        conversations={conversations}
        attendees={attendees}
      />
    );
    expect(screen.getByText("Alice")).toBeDefined();
  });

  it("opens NewMessageDialog when clicking compose button", () => {
    render(
      <MessagesView
        eventId="event-1"
        currentUserId="me"
        basePath="/org/event"
        conversations={conversations}
        attendees={attendees}
      />
    );
    fireEvent.click(screen.getByLabelText("New message"));
    expect(screen.getByText("New Message")).toBeDefined();
  });
});
