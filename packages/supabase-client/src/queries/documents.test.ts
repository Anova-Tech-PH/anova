import { describe, it, expect } from "vitest";
import { getEventDocuments, getAllDocumentsByEvent } from "./documents";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getEventDocuments", () => {
  it("returns event-level documents", async () => {
    const docs = [{ id: "d1", title: "Guide", session_id: null }];
    const client = createMockSupabaseClient({ data: docs }) as unknown as SupabaseClient;
    const result = await getEventDocuments(client, "event-1");
    expect(result).toEqual(docs);
    expect(client.from).toHaveBeenCalledWith("event_documents");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getEventDocuments(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getAllDocumentsByEvent", () => {
  it("returns all documents with session info", async () => {
    const docs = [{ id: "d1", title: "Guide", session: { id: "s1", title: "Talk" } }];
    const client = createMockSupabaseClient({ data: docs }) as unknown as SupabaseClient;
    const result = await getAllDocumentsByEvent(client, "event-1");
    expect(result).toEqual(docs);
    expect(client.from).toHaveBeenCalledWith("event_documents");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getAllDocumentsByEvent(client, "event-1")).rejects.toThrow("fail");
  });
});
