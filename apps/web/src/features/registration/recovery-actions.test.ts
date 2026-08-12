import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock supabase client
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      update: vi.fn((data: unknown) => {
        mockUpdate(data);
        return { eq: (...args: unknown[]) => { mockEq(...args); return Promise.resolve({ error: null }); } };
      }),
    })),
  })),
}));

import { updateRecoverySettings } from "./recovery-actions";
import { revalidatePath } from "next/cache";

describe("updateRecoverySettings", () => {
  const eventId = "evt-123";
  const validSettings = {
    recovery_enabled: true,
    recovery_delay_hours: 24,
    recovery_email_count: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("throws when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(updateRecoverySettings(eventId, validSettings)).rejects.toThrow(
      "Authentication required"
    );
  });

  it("updates event with correct settings", async () => {
    await updateRecoverySettings(eventId, validSettings);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        recovery_enabled: true,
        recovery_delay_hours: 24,
        recovery_email_count: 2,
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", eventId);
  });

  it("clamps recovery_email_count to min 1", async () => {
    await updateRecoverySettings(eventId, { ...validSettings, recovery_email_count: 0 });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ recovery_email_count: 1 })
    );
  });

  it("clamps recovery_email_count to max 3", async () => {
    await updateRecoverySettings(eventId, { ...validSettings, recovery_email_count: 5 });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ recovery_email_count: 3 })
    );
  });

  it("calls revalidatePath with correct path", async () => {
    await updateRecoverySettings(eventId, validSettings);

    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}/marketing`);
  });

  it("throws on supabase error", async () => {
    // Need to re-mock createClient for this test to return an error
    const { createClient } = await import("@attendly/ui/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
        })),
      })),
    } as never);

    await expect(updateRecoverySettings(eventId, validSettings)).rejects.toThrow(
      "Update failed"
    );
  });
});
