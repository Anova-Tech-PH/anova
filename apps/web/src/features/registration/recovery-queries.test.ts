import { describe, it, expect, vi, beforeEach } from "vitest";

// Creates a chainable query builder that resolves to { data, error }
function createQueryBuilder(resolvedValue: { data: unknown; error: unknown }) {
  const terminal = {
    then: (
      resolve: (v: unknown) => void,
      reject?: (e: unknown) => void
    ) => Promise.resolve(resolvedValue).then(resolve, reject),
  };

  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["from", "select", "eq", "single"]) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  // single() is terminal for getRecoverySettings
  builder.single.mockReturnValue({ ...builder, ...terminal });
  // eq() needs to also be terminal for getRecoveryStats (no .single() call)
  // We make eq return an object that has both chain methods AND thenable
  builder.eq.mockReturnValue({ ...builder, ...terminal });

  return builder;
}

const mockCreateClient = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

import { getRecoverySettings, getRecoveryStats } from "./recovery-queries";

describe("getRecoverySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recovery settings for an event", async () => {
    const settings = {
      recovery_enabled: true,
      recovery_delay_hours: 24,
      recovery_email_count: 3,
    };
    const builder = createQueryBuilder({ data: settings, error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const result = await getRecoverySettings("event-1");

    expect(result).toEqual(settings);
    expect(builder.from).toHaveBeenCalledWith("events");
    expect(builder.select).toHaveBeenCalledWith(
      "recovery_enabled, recovery_delay_hours, recovery_email_count"
    );
    expect(builder.eq).toHaveBeenCalledWith("id", "event-1");
    expect(builder.single).toHaveBeenCalled();
  });

  it("throws on supabase error", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "Database error" },
    });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    await expect(getRecoverySettings("event-1")).rejects.toThrow(
      "Database error"
    );
  });
});

describe("getRecoveryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct counts for mixed statuses", async () => {
    const intents = [
      { status: "pending", recovery_emails_sent: 1 },
      { status: "converted", recovery_emails_sent: 2 },
      { status: "expired", recovery_emails_sent: 0 },
      { status: "pending", recovery_emails_sent: 1 },
      { status: "converted", recovery_emails_sent: 3 },
    ];
    const builder = createQueryBuilder({ data: intents, error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const result = await getRecoveryStats("event-1");

    expect(result).toEqual({
      total: 5,
      pending: 2,
      converted: 2,
      expired: 1,
      emailsSent: 7,
    });
    expect(builder.from).toHaveBeenCalledWith("registration_intents");
    expect(builder.select).toHaveBeenCalledWith(
      "status, recovery_emails_sent"
    );
    expect(builder.eq).toHaveBeenCalledWith("event_id", "event-1");
  });

  it("returns zeroes when no intents exist", async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const result = await getRecoveryStats("event-1");

    expect(result).toEqual({
      total: 0,
      pending: 0,
      converted: 0,
      expired: 0,
      emailsSent: 0,
    });
  });

  it("correctly sums recovery_emails_sent across all intents", async () => {
    const intents = [
      { status: "pending", recovery_emails_sent: 5 },
      { status: "pending", recovery_emails_sent: 10 },
      { status: "converted", recovery_emails_sent: 3 },
    ];
    const builder = createQueryBuilder({ data: intents, error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const result = await getRecoveryStats("event-1");

    expect(result.emailsSent).toBe(18);
  });

  it("throws on supabase error", async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: "Query failed" },
    });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    await expect(getRecoveryStats("event-1")).rejects.toThrow("Query failed");
  });
});
