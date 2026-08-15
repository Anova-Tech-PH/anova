import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttendeeCard } from "./attendee-card";

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

vi.mock("@/features/attendee-profile/actions", () => ({
  toggleAttendeeBookmark: vi.fn().mockResolvedValue(undefined),
  saveAttendeeNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/messaging/actions", () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

const baseProfile = {
  id: "user-2",
  display_name: "Alice Smith",
  avatar_url: null,
  title: "Engineer",
  company: "Acme Corp",
  location: "NYC",
};

describe("AttendeeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders attendee name and subtitle", () => {
    render(
      <AttendeeCard
        profile={baseProfile}
        eventId="event-1"
        basePath="/org/event/attendees"
        isBookmarked={false}
      />
    );

    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Engineer @ Acme Corp")).toBeDefined();
  });

  it("renders category badge when provided", () => {
    render(
      <AttendeeCard
        profile={baseProfile}
        eventId="event-1"
        basePath="/org/event/attendees"
        isBookmarked={false}
        categoryName="Speakers"
        categoryColor="blue"
      />
    );

    expect(screen.getByText("Speakers")).toBeDefined();
  });

  it("does not render category badge when not provided", () => {
    render(
      <AttendeeCard
        profile={baseProfile}
        eventId="event-1"
        basePath="/org/event/attendees"
        isBookmarked={false}
      />
    );

    expect(screen.queryByTestId("category-badge")).toBeNull();
  });

  it("renders Say Hi button that opens message input", () => {
    render(
      <AttendeeCard
        profile={baseProfile}
        eventId="event-1"
        basePath="/org/event/attendees"
        isBookmarked={false}
      />
    );

    const sayHiBtn = screen.getByRole("button", { name: /say hi/i });
    expect(sayHiBtn).toBeDefined();
    fireEvent.click(sayHiBtn);

    expect(screen.getByPlaceholderText(/say something nice/i)).toBeDefined();
  });

  it("renders Take Notes button that opens note input", () => {
    render(
      <AttendeeCard
        profile={baseProfile}
        eventId="event-1"
        basePath="/org/event/attendees"
        isBookmarked={false}
        noteContent=""
      />
    );

    const notesBtn = screen.getByRole("button", { name: /take notes/i });
    expect(notesBtn).toBeDefined();
    fireEvent.click(notesBtn);

    expect(
      screen.getByPlaceholderText(/write your notes/i)
    ).toBeDefined();
  });
});
