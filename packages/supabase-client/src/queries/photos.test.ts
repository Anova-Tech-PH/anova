import { describe, it, expect } from "vitest";
import { getPhotos, getPhotoComments } from "./photos";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClientMultiTable, createMockSupabaseClient } from "../test-helpers";

describe("getPhotos", () => {
  it("returns photos with pagination", async () => {
    const photos = [{ id: "p1", user_id: "u1", image_url: "https://img.com/1.jpg", likes_count: 3 }];
    const client = createMockSupabaseClientMultiTable({
      event_photos: { data: photos, count: 1 },
      attendee_profiles: { data: [] },
      photo_likes: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getPhotos(client, "event-1");
    expect(result.photos).toBeDefined();
    expect(result.total).toBeDefined();
    expect(client.from).toHaveBeenCalledWith("event_photos");
  });
});

describe("getPhotoComments", () => {
  it("returns comments for a photo", async () => {
    const comments = [{ id: "c1", content: "Nice!", user_id: "u1" }];
    const client = createMockSupabaseClientMultiTable({
      photo_comments: { data: comments },
      event_photos: { data: { event_id: "e1" } },
      attendee_profiles: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getPhotoComments(client, "p1");
    expect(Array.isArray(result)).toBe(true);
    expect(client.from).toHaveBeenCalledWith("photo_comments");
  });

  it("returns empty array when no comments", async () => {
    const client = createMockSupabaseClientMultiTable({
      photo_comments: { data: [] },
      event_photos: { data: null },
      attendee_profiles: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getPhotoComments(client, "p1");
    expect(result).toEqual([]);
  });
});
