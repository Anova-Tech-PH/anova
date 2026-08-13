import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockPathname = "/events/evt-1/schedule";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

import { EventTopTabs } from "./event-top-tabs";
import { EventNavProvider } from "./event-nav-context";
import type { TopTabGroup } from "./event-top-tabs";

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

function renderWithProvider(ui: React.ReactElement) {
  return render(<EventNavProvider>{ui}</EventNavProvider>);
}

describe("EventTopTabs", () => {
  beforeEach(() => {
    mockPathname = "/events/evt-1/schedule";
  });

  it("renders all category labels", () => {
    renderWithProvider(<EventTopTabs groups={groups} />);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.getByText("Engagement")).toBeInTheDocument();
    expect(screen.getByText("Outreach")).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  it("marks active category based on pathname (exact match)", () => {
    mockPathname = "/events/evt-1/tickets";
    renderWithProvider(<EventTopTabs groups={groups} />);
    const registrationTab = screen.getByText("Registration").closest("button");
    expect(hasClass(registrationTab, "bg-primary")).toBe(true);
  });

  it("marks active category based on pathname (startsWith for items with children)", () => {
    mockPathname = "/events/evt-1/schedule/tracks";
    renderWithProvider(<EventTopTabs groups={groups} />);
    const contentTab = screen.getByText("Content").closest("button");
    expect(hasClass(contentTab, "bg-primary")).toBe(true);
  });

  it("does not mark inactive categories as active", () => {
    mockPathname = "/events/evt-1/schedule";
    renderWithProvider(<EventTopTabs groups={groups} />);
    expect(hasClass(screen.getByText("Registration").closest("button"), "bg-primary")).toBe(false);
    expect(hasClass(screen.getByText("Engagement").closest("button"), "bg-primary")).toBe(false);
    expect(hasClass(screen.getByText("Outreach").closest("button"), "bg-primary")).toBe(false);
    expect(hasClass(screen.getByText("Insights").closest("button"), "bg-primary")).toBe(false);
  });
});
