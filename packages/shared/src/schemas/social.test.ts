import { describe, it, expect } from "vitest";
import { createPostSchema, createCommentSchema, sendMessageSchema, createConversationSchema } from "./social";

const uuid = "00000000-0000-0000-0000-000000000001";

describe("createPostSchema", () => {
  it("accepts valid post", () => {
    const result = createPostSchema.safeParse({ event_id: uuid, content: "Hello!" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("text");
  });

  it("rejects empty content", () => {
    expect(createPostSchema.safeParse({ event_id: uuid, content: "" }).success).toBe(false);
  });

  it("rejects content over 2000 chars", () => {
    expect(createPostSchema.safeParse({ event_id: uuid, content: "x".repeat(2001) }).success).toBe(false);
  });

  it("rejects poll with fewer than 2 options", () => {
    expect(
      createPostSchema.safeParse({ event_id: uuid, content: "Vote", type: "poll", poll_options: ["A"] }).success
    ).toBe(false);
  });

  it("accepts poll with valid options", () => {
    expect(
      createPostSchema.safeParse({ event_id: uuid, content: "Vote", type: "poll", poll_options: ["A", "B"] }).success
    ).toBe(true);
  });
});

describe("createCommentSchema", () => {
  it("accepts valid comment", () => {
    expect(createCommentSchema.safeParse({ post_id: uuid, content: "Nice!" }).success).toBe(true);
  });

  it("rejects content over 500 chars", () => {
    expect(createCommentSchema.safeParse({ post_id: uuid, content: "x".repeat(501) }).success).toBe(false);
  });
});

describe("sendMessageSchema", () => {
  it("accepts valid message", () => {
    expect(sendMessageSchema.safeParse({ conversation_id: uuid, content: "Hi" }).success).toBe(true);
  });

  it("rejects empty content", () => {
    expect(sendMessageSchema.safeParse({ conversation_id: uuid, content: "" }).success).toBe(false);
  });

  it("rejects content over 1000 chars", () => {
    expect(sendMessageSchema.safeParse({ conversation_id: uuid, content: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("createConversationSchema", () => {
  it("accepts valid conversation", () => {
    const result = createConversationSchema.safeParse({ event_id: uuid, member_ids: [uuid] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_group).toBe(false);
  });

  it("rejects empty member_ids", () => {
    expect(createConversationSchema.safeParse({ event_id: uuid, member_ids: [] }).success).toBe(false);
  });
});
