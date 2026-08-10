import { describe, it, expect } from "vitest";
import { createTicketTypeSchema, registerSchema, checkInSchema } from "./registration";

describe("createTicketTypeSchema", () => {
  const valid = {
    event_id: "00000000-0000-0000-0000-000000000001",
    name: "General Admission",
  };

  it("accepts valid ticket type", () => {
    expect(createTicketTypeSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults type to free and price to 0", () => {
    const result = createTicketTypeSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("free");
      expect(result.data.price).toBe(0);
    }
  });

  it("rejects empty name", () => {
    expect(createTicketTypeSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects invalid event_id", () => {
    expect(createTicketTypeSchema.safeParse({ ...valid, event_id: "not-uuid" }).success).toBe(false);
  });

  it("rejects negative price", () => {
    expect(createTicketTypeSchema.safeParse({ ...valid, price: -5 }).success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(createTicketTypeSchema.safeParse({ ...valid, quantity: 1.5 }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    event_id: "00000000-0000-0000-0000-000000000001",
    ticket_type_id: "00000000-0000-0000-0000-000000000002",
    name: "Alice",
    email: "alice@example.com",
  };

  it("accepts valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-email" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(registerSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("accepts optional custom_fields", () => {
    const result = registerSchema.safeParse({ ...valid, custom_fields: { company: "Acme" } });
    expect(result.success).toBe(true);
  });
});

describe("checkInSchema", () => {
  it("accepts valid QR code", () => {
    expect(checkInSchema.safeParse({ qr_code: "abc-123" }).success).toBe(true);
  });

  it("rejects empty QR code", () => {
    expect(checkInSchema.safeParse({ qr_code: "" }).success).toBe(false);
  });
});
