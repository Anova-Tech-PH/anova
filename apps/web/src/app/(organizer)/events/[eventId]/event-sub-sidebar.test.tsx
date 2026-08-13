import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockPathname = "/events/evt-1/schedule";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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

const baseGroups = [
  {
    label: "Event",
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

describe("EventSubSidebar", () => {
  beforeEach(() => {
    mockPathname = "/events/evt-1/schedule";
  });

  it("renders event title", () => {
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("My Event")).toBeInTheDocument();
  });

  it("renders group label", () => {
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Event")).toBeInTheDocument();
  });

  it("renders parent items", () => {
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Agenda Center")).toBeInTheDocument();
    expect(screen.getByText("Attendees")).toBeInTheDocument();
  });

  it("shows children when parent path matches pathname", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Session Manager")).toBeInTheDocument();
    expect(screen.getByText("Track Manager")).toBeInTheDocument();
    expect(screen.getByText("Conflict Check")).toBeInTheDocument();
    expect(screen.getByText("Session Q&A")).toBeInTheDocument();
  });

  it("applies active style to child matching exact pathname", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const trackLink = screen.getByText("Track Manager").closest("a");
    expect(trackLink?.className).toContain("font-medium");
  });

  it("does not apply active style to non-matching children", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const conflictLink = screen.getByText("Conflict Check").closest("a");
    expect(conflictLink?.className).not.toContain("font-medium");
  });

  it("collapses children when chevron is clicked", () => {
    mockPathname = "/events/evt-1/schedule";
    const { container } = render(
      <EventSubSidebar eventTitle="My Event" groups={baseGroups} />
    );
    // Children should be visible initially (pathname matches)
    expect(screen.getByText("Session Manager")).toBeInTheDocument();

    // Click the chevron toggle button
    const chevronButton = container.querySelector("button[type='button']");
    expect(chevronButton).toBeTruthy();
    fireEvent.click(chevronButton!);

    // Children should be hidden after toggle
    expect(screen.queryByText("Session Manager")).not.toBeInTheDocument();
  });

  it("renders Back to Events link", () => {
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    expect(screen.getByText("Back to Events")).toBeInTheDocument();
  });

  it("marks parent as active when pathname starts with parent href", () => {
    mockPathname = "/events/evt-1/schedule/qa";
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const agendaLink = screen.getByText("Agenda Center").closest("a");
    expect(agendaLink?.className).toContain("font-medium");
  });

  it("does not mark non-matching parent as active", () => {
    mockPathname = "/events/evt-1/schedule";
    render(<EventSubSidebar eventTitle="My Event" groups={baseGroups} />);
    const attendeesLink = screen.getByText("Attendees").closest("a");
    expect(attendeesLink?.className).not.toContain("font-medium");
  });
});
