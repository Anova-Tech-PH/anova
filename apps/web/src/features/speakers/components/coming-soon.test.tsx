import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComingSoon } from "./coming-soon";

describe("ComingSoon", () => {
  it("renders title and description", () => {
    render(
      <ComingSoon
        title="Speaker 1-1 Meetings"
        description="Schedule and manage one-on-one meetings between speakers."
      />
    );

    expect(screen.getByText("Speaker 1-1 Meetings")).toBeInTheDocument();
    expect(
      screen.getByText("Schedule and manage one-on-one meetings between speakers.")
    ).toBeInTheDocument();
  });

  it("renders Coming Soon badge", () => {
    render(
      <ComingSoon
        title="Message Speakers"
        description="Send emails to your speakers."
      />
    );

    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(
      <ComingSoon
        title="Release & Consent Forms"
        description="Collect signed release forms from speakers."
        icon={<svg data-testid="custom-icon" />}
      />
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
