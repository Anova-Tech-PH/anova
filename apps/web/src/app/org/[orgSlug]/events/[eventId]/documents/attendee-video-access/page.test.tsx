import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AttendeeVideoAccessPage from "./page";

describe("AttendeeVideoAccessPage", () => {
  it("renders page title and description", () => {
    render(<AttendeeVideoAccessPage />);
    expect(screen.getAllByText("Attendee Video Access").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Control which attendees can access video recordings/)
    ).toBeInTheDocument();
  });

  it("renders Coming Soon badge", () => {
    render(<AttendeeVideoAccessPage />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });
});
