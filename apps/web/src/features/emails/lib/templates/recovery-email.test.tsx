import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { RecoveryEmail } from "./recovery-email";

const baseProps = {
  eventName: "Tech Summit 2026",
  eventDate: "August 15, 2026",
  ticketName: "VIP Pass",
  registrationUrl: "https://example.com/register/abc123",
  unsubscribeUrl: "https://example.com/unsubscribe/xyz789",
};

describe("RecoveryEmail", () => {
  it("renders the event name", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("Tech Summit 2026");
  });

  it("renders the event date", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("August 15, 2026");
  });

  it("renders the ticket name", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("VIP Pass");
  });

  it("includes the registration CTA link", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("https://example.com/register/abc123");
  });

  it("includes the unsubscribe link", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("https://example.com/unsubscribe/xyz789");
  });

  it("shows venue when provided", async () => {
    const html = await render(
      <RecoveryEmail {...baseProps} venueName="Convention Center" />
    );
    expect(html).toContain("Convention Center");
    expect(html).toContain("Where:");
  });

  it("omits venue when not provided", async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).not.toContain("Where:");
  });

  it('contains "Complete your registration" heading', async () => {
    const html = await render(<RecoveryEmail {...baseProps} />);
    expect(html).toContain("Complete your registration");
  });
});
