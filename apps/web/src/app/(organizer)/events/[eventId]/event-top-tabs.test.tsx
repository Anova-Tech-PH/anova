import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockPathname = "/events/evt-1/schedule";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { EventTopTabs } from "./event-top-tabs";
import type { TopTabGroup } from "./event-top-tabs";

/** Check if an element has a specific class (space-delimited exact match) */
function hasClass(el: Element | null, cls: string): boolean {
  if (!el) return false;
  return el.className.split(/\s+/).includes(cls);
}

const groups: TopTabGroup[] = [
  {
    label: "Content",
    icon: "layout-grid",
    firstHref: "/events/evt-1/schedule",
    items: [
      {
        href: "/events/evt-1/schedule",
        label: "Agenda Center",
        icon: "calendar",
        children: [
          { href: "/events/evt-1/schedule", label: "Session Manager" },
          { href: "/events/evt-1/schedule/tracks", label: "Tracks" },
        ],
      },
      { href: "/events/evt-1/speakers", label: "Speakers", icon: "mic" },
    ],
  },
  {
    label: "Registration",
    icon: "ticket",
    firstHref: "/events/evt-1/tickets",
    items: [
      { href: "/events/evt-1/tickets", label: "Tickets", icon: "ticket" },
    ],
  },
  {
    label: "Engagement",
    icon: "megaphone",
    firstHref: "/events/evt-1/polls",
    items: [
      { href: "/events/evt-1/polls", label: "Live Polls", icon: "bar-chart-2" },
    ],
  },
  {
    label: "Outreach",
    icon: "globe",
    firstHref: "/events/evt-1/emails",
    items: [
      { href: "/events/evt-1/emails", label: "Emails", icon: "mail" },
    ],
  },
  {
    label: "Insights",
    icon: "bar-chart-3",
    firstHref: "/events/evt-1/analytics",
    items: [
      { href: "/events/evt-1/analytics", label: "Analytics", icon: "bar-chart-3" },
    ],
  },
];

describe("EventTopTabs", () => {
  beforeEach(() => {
    mockPathname = "/events/evt-1/schedule";
  });

  it("renders all category labels", () => {
    render(<EventTopTabs groups={groups} />);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.getByText("Engagement")).toBeInTheDocument();
    expect(screen.getByText("Outreach")).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  it("marks active category based on pathname (exact match)", () => {
    mockPathname = "/events/evt-1/tickets";
    render(<EventTopTabs groups={groups} />);
    const registrationTab = screen.getByText("Registration").closest("a");
    expect(hasClass(registrationTab, "bg-white")).toBe(true);
  });

  it("marks active category based on pathname (startsWith for items with children)", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    render(<EventTopTabs groups={groups} />);
    const contentTab = screen.getByText("Content").closest("a");
    expect(hasClass(contentTab, "bg-white")).toBe(true);
  });

  it("does not mark inactive categories as active", () => {
    mockPathname = "/events/evt-1/schedule";
    render(<EventTopTabs groups={groups} />);
    expect(hasClass(screen.getByText("Registration").closest("a"), "bg-white")).toBe(false);
    expect(hasClass(screen.getByText("Engagement").closest("a"), "bg-white")).toBe(false);
    expect(hasClass(screen.getByText("Outreach").closest("a"), "bg-white")).toBe(false);
    expect(hasClass(screen.getByText("Insights").closest("a"), "bg-white")).toBe(false);
  });

  it("links each tab to the firstHref of its group", () => {
    render(<EventTopTabs groups={groups} />);
    const contentTab = screen.getByText("Content").closest("a");
    expect(contentTab).toHaveAttribute("href", "/events/evt-1/schedule");

    const registrationTab = screen.getByText("Registration").closest("a");
    expect(registrationTab).toHaveAttribute("href", "/events/evt-1/tickets");

    const engagementTab = screen.getByText("Engagement").closest("a");
    expect(engagementTab).toHaveAttribute("href", "/events/evt-1/polls");

    const outreachTab = screen.getByText("Outreach").closest("a");
    expect(outreachTab).toHaveAttribute("href", "/events/evt-1/emails");

    const insightsTab = screen.getByText("Insights").closest("a");
    expect(insightsTab).toHaveAttribute("href", "/events/evt-1/analytics");
  });
});
