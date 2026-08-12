import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { trackRegistrationIntent } from "./intent-actions";

describe("trackRegistrationIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { id: "intent-123" },
      error: null,
    });
  });

  it("upserts with correct data", async () => {
    const result = await trackRegistrationIntent({
      event_id: "evt-1",
      ticket_type_id: "tt-1",
      email: "test@example.com",
    });

    expect(mockFrom).toHaveBeenCalledWith("registration_intents");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        email: "test@example.com",
        status: "pending",
      }),
      { onConflict: "event_id,email", ignoreDuplicates: false }
    );
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(result).toEqual({ id: "intent-123" });
  });

  it("lowercases and trims email", async () => {
    await trackRegistrationIntent({
      event_id: "evt-1",
      ticket_type_id: "tt-1",
      email: "  Test@Example.COM  ",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
      }),
      expect.any(Object)
    );
  });

  it("passes through optional name and custom_fields", async () => {
    await trackRegistrationIntent({
      event_id: "evt-1",
      ticket_type_id: "tt-1",
      email: "test@example.com",
      name: "Jane Doe",
      custom_fields: { company: "Acme" },
      promo_code_id: "promo-1",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        custom_fields: { company: "Acme" },
        promo_code_id: "promo-1",
      }),
      expect.any(Object)
    );
  });

  it("defaults name, custom_fields, and promo_code_id when not provided", async () => {
    await trackRegistrationIntent({
      event_id: "evt-1",
      ticket_type_id: "tt-1",
      email: "test@example.com",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: null,
        custom_fields: {},
        promo_code_id: null,
      }),
      expect.any(Object)
    );
  });

  it("throws on supabase error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Something went wrong" },
    });

    await expect(
      trackRegistrationIntent({
        event_id: "evt-1",
        ticket_type_id: "tt-1",
        email: "test@example.com",
      })
    ).rejects.toThrow("Something went wrong");
  });
});
