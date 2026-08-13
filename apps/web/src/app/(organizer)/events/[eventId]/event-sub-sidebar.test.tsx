import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockPathname = "/events/evt-1/schedule";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("motion/react", () => ({
  motion: {
    aside: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, layoutId, ...rest } = props;
      return <aside {...rest}>{children}</aside>;
    },
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { EventSubSidebar } from "./event-sub-sidebar";
import { EventNavProvider } from "./event-nav-context";
import type { TopTabGroup } from "./event-top-tabs";

function renderWithProvider(ui: React.ReactElement) {
  return render(<EventNavProvider>{ui}</EventNavProvider>);
}

const baseGroups: TopTabGroup[] = [
  {
    label: "Event",
    icon: "layout-grid",
    firstHref: "/events/evt-1/schedule",
    items: [
      {
        href: "/events/evt-1/schedule",
        label: "Agenda Center",
        icon: "calendar",
        children: [
          { href: "/events/evt-1/schedule", label: "Session Manager" },
          { href: "/events/evt-1/schedule/tracks", label: "Track Manager" },
          { href: "/events/evt-1/schedule/conflicts", label: "Conflict Check" },
          { href: "/events/evt-1/schedule/qa", label: "Session Q&A" },
        ],
      },
      {
        href: "/events/evt-1/attendees",
        label: "Attendees",
        icon: "users",
      },
    ],
  },
];

const twoGroupSetup: TopTabGroup[] = [
  {
    label: "Event",
    icon: "layout-grid",
    firstHref: "/events/evt-1/schedule",
    items: [
      {
        href: "/events/evt-1/schedule",
        label: "Agenda Center",
        icon: "calendar",
      },
      {
        href: "/events/evt-1/attendees",
        label: "Attendees",
        icon: "users",
      },
    ],
  },
  {
    label: "Engagement",
    icon: "megaphone",
    firstHref: "/events/evt-1/announcements",
    items: [
      {
        href: "/events/evt-1/announcements",
        label: "Announcements",
        icon: "megaphone",
      },
      {
        href: "/events/evt-1/polls",
        label: "Polls",
        icon: "bar-chart-3",
      },
    ],
  },
];

describe("EventSubSidebar", () => {
  beforeEach(() => {
    mockPathname = "/events/evt-1/schedule";
  });

  it("renders event title", () => {
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("My Event")).toBeInTheDocument();
  });

  it("renders parent items", () => {
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Agenda Center")).toBeInTheDocument();
    expect(screen.getByText("Attendees")).toBeInTheDocument();
  });

  it("shows children when parent path matches pathname", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Session Manager")).toBeInTheDocument();
    expect(screen.getByText("Track Manager")).toBeInTheDocument();
    expect(screen.getByText("Conflict Check")).toBeInTheDocument();
    expect(screen.getByText("Session Q&A")).toBeInTheDocument();
  });

  it("applies active style to child matching exact pathname", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const trackLink = screen.getByText("Track Manager").closest("button");
    expect(trackLink?.className).toContain("font-medium");
  });

  it("does not apply active style to non-matching children", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const conflictLink = screen.getByText("Conflict Check").closest("button");
    expect(conflictLink?.className).not.toContain("font-medium");
  });

  it("collapses children when chevron is clicked", () => {
    mockPathname = "/events/evt-1/schedule";
    const { container } = renderWithProvider(
      <EventSubSidebar eventTitle="My Event" groups={baseGroups} />
    );
    // Children should be visible initially (pathname matches)
    expect(screen.getByText("Session Manager")).toBeInTheDocument();

    // Click the chevron toggle button (second button in the parent item row)
    const buttons = container.querySelectorAll("button[type='button']");
    // Find the chevron button - it's the narrow one next to Agenda Center
    const chevronButton = Array.from(buttons).find((btn) =>
      btn.querySelector("svg") && btn.className.includes("h-7 w-7")
    );
    expect(chevronButton).toBeTruthy();
    fireEvent.click(chevronButton!);

    // Children should be hidden after toggle
    expect(screen.queryByText("Session Manager")).not.toBeInTheDocument();
  });

  it("renders Back to Events link", () => {
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Back to Events")).toBeInTheDocument();
  });

  it("marks parent as active when pathname starts with parent href", () => {
    mockPathname = "/events/evt-1/schedule/qa";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const agendaLink = screen.getByText("Agenda Center").closest("button");
    expect(agendaLink?.className).toContain("font-medium");
  });

  it("does not mark non-matching parent as active", () => {
    mockPathname = "/events/evt-1/schedule";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const attendeesLink = screen.getByText("Attendees").closest("button");
    expect(attendeesLink?.className).not.toContain("font-medium");
  });

  it("only renders items from the active category", () => {
    mockPathname = "/events/evt-1/announcements";
    renderWithProvider(<EventSubSidebar eventTitle="My Event" groups={twoGroupSetup} />);

    // Second group's items should be visible
    expect(screen.getByText("Announcements")).toBeInTheDocument();
    expect(screen.getByText("Polls")).toBeInTheDocument();

    // First group's items should NOT be visible
    expect(screen.queryByText("Agenda Center")).not.toBeInTheDocument();
    expect(screen.queryByText("Attendees")).not.toBeInTheDocument();
  });
});
