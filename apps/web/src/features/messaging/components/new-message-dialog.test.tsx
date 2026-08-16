import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewMessageDialog } from "./new-message-dialog";

vi.mock("@/features/messaging/actions", () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

const attendees = [
  {
    id: "user-1",
    display_name: "Alice Smith",
    avatar_url: null,
    title: "Engineer",
    company: "Acme",
  },
  {
    id: "user-2",
    display_name: "Bob Johnson",
    avatar_url: null,
    title: "Designer",
    company: "DesignCo",
  },
  {
    id: "user-3",
    display_name: "Charlie Brown",
    avatar_url: null,
    title: null,
    company: null,
  },
];

describe("NewMessageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    render(
      <NewMessageDialog
        eventId="event-1"
        attendees={attendees}
        open={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText("New Message")).toBeNull();
  });

  it("renders attendee list when open", () => {
    render(
      <NewMessageDialog
        eventId="event-1"
        attendees={attendees}
        open={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("New Message")).toBeDefined();
    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Bob Johnson")).toBeDefined();
    expect(screen.getByText("Charlie Brown")).toBeDefined();
  });

  it("filters attendees by search query", () => {
    render(
      <NewMessageDialog
        eventId="event-1"
        attendees={attendees}
        open={true}
        onClose={vi.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText("Search attendees...");
    fireEvent.change(searchInput, { target: { value: "alice" } });

    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.queryByText("Bob Johnson")).toBeNull();
  });

  it("shows message input after selecting a recipient", () => {
    render(
      <NewMessageDialog
        eventId="event-1"
        attendees={attendees}
        open={true}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Alice Smith"));

    expect(screen.getByPlaceholderText(/write a message/i)).toBeDefined();
  });

  it("disables send button when message is empty", () => {
    render(
      <NewMessageDialog
        eventId="event-1"
        attendees={attendees}
        open={true}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Alice Smith"));

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton.hasAttribute("disabled")).toBe(true);
  });
});
