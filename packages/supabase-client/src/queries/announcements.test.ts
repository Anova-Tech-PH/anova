import { describe, it, expect } from "vitest";
import { getAnnouncementsForAttendee, getUnreadAnnouncementCount } from "./announcements";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getAnnouncementsForAttendee", () => {
  it("returns sent announcements for event", async () => {
    const announcements = [{ id: "a1", subject: "Welcome", status: "sent" }];
    const client = createMockSupabaseClient({ data: announcements }) as unknown as SupabaseClient;
    const result = await getAnnouncementsForAttendee(client, "event-1");
    expect(result).toEqual(announcements);
    expect(client.from).toHaveBeenCalledWith("announcements");
  });

  it("returns empty array on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    const result = await getAnnouncementsForAttendee(client, "event-1");
    expect(result).toEqual([]);
  });
});

describe("getUnreadAnnouncementCount", () => {
  it("returns unread count for user", async () => {
    const announcements = [{ id: "a1" }, { id: "a2" }, { id: "a3" }];
    const reads = [{ announcement_id: "a1" }];
    const client = createMockSupabaseClientMultiTable({
      announcements: { data: announcements },
      announcement_reads: { data: reads },
    }) as unknown as SupabaseClient;
    (client.auth.getUser as ReturnType<typeof import("vitest").vi.fn>).mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const result = await getUnreadAnnouncementCount(client, "event-1", "user-1");
    expect(result).toBe(2);
  });

  it("returns 0 when no announcements", async () => {
    const client = createMockSupabaseClientMultiTable({
      announcements: { data: [] },
      announcement_reads: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getUnreadAnnouncementCount(client, "event-1", "user-1");
    expect(result).toBe(0);
  });
});
