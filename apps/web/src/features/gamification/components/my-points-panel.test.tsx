import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyPointsPanel } from "./my-points-panel";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("MyPointsPanel", () => {
  const defaultProps = {
    userName: "Alice",
    totalPoints: 150,
    rank: 3,
    completionPercent: 25,
    challenges: [
      { activityType: "poll_vote", count: 2, pointsPerAction: 5, enabled: true },
      { activityType: "photo_upload", count: 0, pointsPerAction: 10, enabled: true },
      { activityType: "session_rsvp", count: 1, pointsPerAction: 5, enabled: true },
      { activityType: "meetup_join", count: 0, pointsPerAction: 15, enabled: true },
    ],
    basePath: "/org/event",
  };

  it("renders user name and points", () => {
    render(<MyPointsPanel {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("150 points")).toBeDefined();
  });

  it("renders rank", () => {
    render(<MyPointsPanel {...defaultProps} />);
    expect(screen.getByText("#3")).toBeDefined();
  });

  it("renders completion percentage", () => {
    render(<MyPointsPanel {...defaultProps} />);
    expect(screen.getByText(/25%/)).toBeDefined();
  });

  it("renders category headings for categories that have activities", () => {
    render(<MyPointsPanel {...defaultProps} />);
    expect(screen.getByText("Share your voice")).toBeDefined();
    expect(screen.getByText("Join the fun")).toBeDefined();
    expect(screen.getByText("Connect & network")).toBeDefined();
    expect(screen.getByText("Explore the event")).toBeDefined();
  });

  it("shows Not ranked when rank is null", () => {
    render(<MyPointsPanel {...defaultProps} rank={null} />);
    expect(screen.getByText("Not ranked")).toBeDefined();
  });

  it("renders challenge links with correct hrefs", () => {
    render(<MyPointsPanel {...defaultProps} />);
    const pollLink = screen.getByText("Poll Vote").closest("a");
    expect(pollLink?.getAttribute("href")).toBe("/org/event/community");
  });
});
