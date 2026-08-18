import { describe, it, expect } from "vitest";
import { getCertificateConfig } from "./certificates";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMockSupabaseClient } from "../test-helpers";

describe("getCertificateConfig", () => {
  it("returns certificate config for event", async () => {
    const config = { id: "cc1", event_id: "event-1", enabled: true, template: "default" };
    const client = createMockSupabaseClient({ data: config }) as unknown as SupabaseClient;
    const result = await getCertificateConfig(client, "event-1");
    expect(result).toEqual(config);
    expect(client.from).toHaveBeenCalledWith("certificate_configs");
  });

  it("returns null when no config", async () => {
    const client = createMockSupabaseClient({ data: null, error: { message: "not found" } }) as unknown as SupabaseClient;
    const result = await getCertificateConfig(client, "event-1");
    expect(result).toBeNull();
  });
});
