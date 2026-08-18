import { describe, it, expect } from "vitest";
import { getFeedbackForms, getDefaultFeedbackForm } from "./feedback";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getFeedbackForms", () => {
  it("returns feedback forms for event", async () => {
    const forms = [{ id: "f1", name: "Session Feedback", questions: [], is_default: true }];
    const client = createMockSupabaseClient({ data: forms }) as unknown as SupabaseClient;
    const result = await getFeedbackForms(client, "event-1");
    expect(result).toEqual(forms);
    expect(client.from).toHaveBeenCalledWith("feedback_forms");
  });

  it("throws on error", async () => {
    const client = createMockSupabaseClient({ error: { message: "fail" } }) as unknown as SupabaseClient;
    await expect(getFeedbackForms(client, "event-1")).rejects.toThrow("fail");
  });
});

describe("getDefaultFeedbackForm", () => {
  it("returns default feedback form", async () => {
    const form = { id: "f1", name: "Default", questions: [{ id: "q1", label: "Rating" }], is_default: true };
    const client = createMockSupabaseClient({ data: form }) as unknown as SupabaseClient;
    const result = await getDefaultFeedbackForm(client, "event-1");
    expect(result).toEqual(form);
    expect(client.from).toHaveBeenCalledWith("feedback_forms");
  });

  it("returns null when no default form", async () => {
    const client = createMockSupabaseClient({ data: null, error: { message: "not found" } }) as unknown as SupabaseClient;
    const result = await getDefaultFeedbackForm(client, "event-1");
    expect(result).toBeNull();
  });
});
