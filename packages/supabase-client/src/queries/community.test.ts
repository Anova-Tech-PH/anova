import { describe, it, expect } from "vitest";
import { getTopics, getTopicDetail, getIcebreaker } from "./community";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient, createMockSupabaseClientMultiTable } from "../test-helpers";

describe("getTopics", () => {
  it("returns topics for event", async () => {
    const topics = [{ id: "t1", title: "Intro", community_posts: [{ count: 2 }], community_topic_follows: [{ count: 1 }] }];
    const client = createMockSupabaseClientMultiTable({
      community_topics: { data: topics },
      community_topic_follows: { data: [] },
      community_topic_read_status: { data: [] },
      community_posts: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getTopics(client, "event-1", "user-1");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(client.from).toHaveBeenCalledWith("community_topics");
  });

  it("returns empty for no topics", async () => {
    const client = createMockSupabaseClientMultiTable({
      community_topics: { data: [] },
      community_topic_follows: { data: [] },
      community_topic_read_status: { data: [] },
      community_posts: { data: [] },
    }) as unknown as SupabaseClient;

    const result = await getTopics(client, "event-1", "user-1");
    expect(result).toEqual([]);
  });
});

describe("getTopicDetail", () => {
  it("returns topic with posts", async () => {
    const topic = { id: "t1", title: "Discussion", author_id: "u1", event_id: "e1" };
    const client = createMockSupabaseClientMultiTable({
      community_topics: { data: topic },
      community_posts: { data: [] },
      attendee_profiles: { data: { display_name: "User", avatar_url: null } },
      community_post_reactions: { data: [] },
      community_topic_follows: { data: null },
    }) as unknown as SupabaseClient;

    const result = await getTopicDetail(client, "t1");
    expect(result.id).toBe("t1");
    expect(client.from).toHaveBeenCalledWith("community_topics");
  });
});

describe("getIcebreaker", () => {
  it("returns icebreaker with response status", async () => {
    const icebreaker = { id: "ib1", question: "What excites you?", enabled: true };
    const client = createMockSupabaseClientMultiTable({
      event_icebreakers: { data: icebreaker },
      icebreaker_responses: { data: null },
    }) as unknown as SupabaseClient;

    const result = await getIcebreaker(client, "event-1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("ib1");
  });

  it("returns null when no icebreaker", async () => {
    const client = createMockSupabaseClient({ data: null }) as unknown as SupabaseClient;
    const result = await getIcebreaker(client, "event-1");
    expect(result).toBeNull();
  });
});
