import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewDropdown } from "./preview-dropdown";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("PreviewDropdown", () => {
  const defaultProps = {
    portalUrl: "/test-org/test-event",
    registrationPages: [
      { name: "Attendee Registration", slug: "attendee-registration" },
      { name: "VIP Registration", slug: "vip-registration" },
    ],
  };

  it("renders Preview button", () => {
    render(<PreviewDropdown {...defaultProps} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows dropdown items when clicked", async () => {
    const user = userEvent.setup();
    render(<PreviewDropdown {...defaultProps} />);
    await user.click(screen.getByText("Preview"));
    expect(screen.getByText("Web App")).toBeInTheDocument();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
  });

  it("lists all registration pages in dropdown", async () => {
    const user = userEvent.setup();
    render(<PreviewDropdown {...defaultProps} />);
    await user.click(screen.getByText("Preview"));
    expect(screen.getByText("Attendee Registration")).toBeInTheDocument();
    expect(screen.getByText("VIP Registration")).toBeInTheDocument();
  });

  it("links registration pages to /register/slug", async () => {
    const user = userEvent.setup();
    render(<PreviewDropdown {...defaultProps} />);
    await user.click(screen.getByText("Preview"));
    const attendeeLink = screen.getByText("Attendee Registration").closest("a");
    expect(attendeeLink).toHaveAttribute("href", "/register/test-org/test-event/attendee-registration");
    const vipLink = screen.getByText("VIP Registration").closest("a");
    expect(vipLink).toHaveAttribute("href", "/register/test-org/test-event/vip-registration");
  });

  it("shows single Registration Page link when no pages provided", async () => {
    const user = userEvent.setup();
    render(<PreviewDropdown portalUrl="/test-org/test-event" registrationPages={[]} />);
    await user.click(screen.getByText("Preview"));
    const regLink = screen.getByText("Registration Page").closest("a");
    expect(regLink).toHaveAttribute("href", "/register/test-org/test-event");
  });
});
