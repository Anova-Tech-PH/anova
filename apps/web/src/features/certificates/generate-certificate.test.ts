import { describe, it, expect } from "vitest";
import { generateCertificatePdf } from "./generate-certificate";

describe("generateCertificatePdf", () => {
  it("returns a Uint8Array for valid input", () => {
    const result = generateCertificatePdf({
      attendeeName: "Alice Smith",
      eventTitle: "Tech Conference 2024",
      organizationName: "Acme Events",
      eventStartDate: "2024-06-15",
      eventEndDate: "2024-06-17",
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(100);
  });

  it("generates valid PDF (starts with PDF header)", () => {
    const result = generateCertificatePdf({
      attendeeName: "Bob Jones",
      eventTitle: "Workshop",
      organizationName: "Org",
      eventStartDate: "2024-01-01",
      eventEndDate: null,
    });

    const header = new TextDecoder().decode(result.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("handles null endDate", () => {
    const result = generateCertificatePdf({
      attendeeName: "Carol",
      eventTitle: "One Day Event",
      organizationName: "Org",
      eventStartDate: "2024-03-15",
      eventEndDate: null,
    });

    expect(result).toBeInstanceOf(Uint8Array);
  });
});
