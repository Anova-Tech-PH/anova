import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VideoHostingPage from "./page";

describe("VideoHostingPage", () => {
  it("renders page title and description", () => {
    render(<VideoHostingPage />);
    expect(screen.getAllByText("Video Hosting").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Host and manage video content for your event/)
    ).toBeInTheDocument();
  });

  it("renders Coming Soon badge", () => {
    render(<VideoHostingPage />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });
});
