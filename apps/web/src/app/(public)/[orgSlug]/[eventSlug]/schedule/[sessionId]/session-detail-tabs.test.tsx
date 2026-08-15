import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionDetailTabs } from "./session-detail-tabs";

describe("SessionDetailTabs", () => {
  const defaultProps = {
    pollsContent: <div>Polls content</div>,
    chatContent: <div>Chat content</div>,
    communityContent: <div>Community content</div>,
    hasPolls: true,
  };

  it("renders Polls, Chat, and Community tabs", () => {
    render(<SessionDetailTabs {...defaultProps} />);
    expect(screen.getByText("Polls")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.queryByText("Q&A")).not.toBeInTheDocument();
  });

  it("shows community content when Community tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SessionDetailTabs {...defaultProps} />);
    await user.click(screen.getByText("Community"));
    expect(screen.getByText("Community content")).toBeInTheDocument();
  });

  it("defaults to polls tab when hasPolls is true", () => {
    render(<SessionDetailTabs {...defaultProps} />);
    expect(screen.getByText("Polls content")).toBeInTheDocument();
  });

  it("defaults to chat tab when hasPolls is false", () => {
    render(<SessionDetailTabs {...defaultProps} hasPolls={false} />);
    expect(screen.getByText("Chat content")).toBeInTheDocument();
  });
});
