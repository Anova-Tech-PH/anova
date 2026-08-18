import { describe, it, expect, vi } from "vitest";
import { rsvpToSession, cancelRsvp } from "./rsvp";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("rsvpToSession", () => {
  it("calls rpc with session ID", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "confirmed", error: null });
    const client = { rpc } as unknown as SupabaseClient;
    const result = await rsvpToSession(client, "session-1");
    expect(rpc).toHaveBeenCalledWith("rsvp_to_session", { _session_id: "session-1" });
    expect(result).toBe("confirmed");
  });

  it("throws on error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } });
    const client = { rpc } as unknown as SupabaseClient;
    await expect(rsvpToSession(client, "s1")).rejects.toThrow("fail");
  });
});

describe("cancelRsvp", () => {
  it("calls rpc with session ID", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient;
    await cancelRsvp(client, "session-1");
    expect(rpc).toHaveBeenCalledWith("cancel_session_rsvp", { _session_id: "session-1" });
  });
});
