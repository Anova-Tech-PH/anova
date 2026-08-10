import { describe, it, expect } from "vitest";
import { generateBadgesPdf } from "./generate-badges";

describe("generateBadgesPdf", () => {
  const baseConfig = {
    showCompany: true,
    showJobTitle: true,
    showLabels: true,
    colorByTicketType: true,
  };

  it("returns a non-empty Uint8Array for a single attendee", async () => {
    const result = await generateBadgesPdf(
      [
        {
          name: "Alice Smith",
          email: "alice@example.com",
          company: "Acme Corp",
          jobTitle: "Engineer",
          ticketType: "VIP",
          qrCode: "QR-ALICE-001",
          labels: ["SPEAKER"],
        },
      ],
      "Test Conference",
      baseConfig
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(100);
  });

  it("handles multiple attendees across pages (>4 creates new page)", async () => {
    const attendees = Array.from({ length: 6 }, (_, i) => ({
      name: `Attendee ${i + 1}`,
      email: `a${i + 1}@example.com`,
      ticketType: "General",
      qrCode: `QR-${i + 1}`,
    }));

    const result = await generateBadgesPdf(attendees, "Multi-Page Event", baseConfig);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(100);
  });

  it("handles attendees with no optional fields", async () => {
    const result = await generateBadgesPdf(
      [
        {
          name: "Bob",
          email: "bob@example.com",
          ticketType: "Free",
          qrCode: "QR-BOB",
        },
      ],
      "Minimal Event",
      { showCompany: false, showJobTitle: false, showLabels: false, colorByTicketType: false }
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(100);
  });

  it("returns valid PDF (starts with PDF header)", async () => {
    const result = await generateBadgesPdf(
      [{ name: "Test", email: "t@t.com", ticketType: "GA", qrCode: "QR" }],
      "Event",
      baseConfig
    );

    // jsPDF output starts with %PDF
    const header = new TextDecoder().decode(result.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
