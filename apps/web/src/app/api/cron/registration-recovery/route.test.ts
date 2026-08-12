import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockSend = vi.fn().mockResolvedValue({ data: { id: "resend-id-1" }, error: null });

vi.mock("@/features/emails/lib/resend", () => ({
  getResend: () => ({ emails: { send: mockSend } }),
}));

vi.mock("@react-email/components", () => ({
  render: vi.fn().mockResolvedValue("<html>test</html>"),
}));

vi.mock("@/features/emails/lib/templates/recovery-email", () => ({
  RecoveryEmail: vi.fn().mockReturnValue("RecoveryEmailComponent"),
}));

vi.mock("@/features/emails/lib/unsubscribe", () => ({
  generateUnsubscribeToken: vi.fn().mockResolvedValue("test-token"),
}));

// Supabase mock infrastructure
type MockResult = { data: any; error: any };
type TableOverrides = Record<string, MockResult[]>;

let tableResults: TableOverrides = {};

function createChain(tableName: string): any {
  // Each call to .from(tableName) pops the next result from the queue
  const resultQueue = tableResults[tableName] || [];

  const chain: any = {};
  const methods = [
    "select",
    "eq",
    "lt",
    "in",
    "limit",
    "single",
    "insert",
    "update",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain thenable so `await supabase.from(...).select(...)` resolves
  chain.then = (resolve: any, _reject: any) => {
    const result = resultQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(resolve(result));
  };
  return chain;
}

const mockFrom = vi.fn((tableName: string) => createChain(tableName));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// --- Helpers ---

function makeRequest(withAuth = true): Request {
  const headers: Record<string, string> = {};
  if (withAuth) {
    headers["authorization"] = `Bearer ${process.env.CRON_SECRET}`;
  }
  return new Request("https://localhost/api/cron/registration-recovery", {
    headers,
  });
}

function makeEvent(overrides: Record<string, any> = {}) {
  return {
    id: "event-1",
    title: "Test Event",
    start_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    end_date: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
    venue_name: "Test Venue",
    slug: "test-event",
    organization_id: "org-1",
    recovery_delay_hours: 1,
    recovery_email_count: 3,
    organizations: { slug: "test-org" },
    ...overrides,
  };
}

function makeIntent(overrides: Record<string, any> = {}) {
  return {
    id: "intent-1",
    email: "user@example.com",
    name: "Test User",
    ticket_type_id: "ticket-1",
    recovery_emails_sent: 0,
    last_recovery_email_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    ticket_types: { name: "General Admission" },
    ...overrides,
  };
}

// --- Tests ---

describe("GET /api/cron/registration-recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFrom.mockClear();
    mockSend.mockClear();
    mockSend.mockResolvedValue({ data: { id: "resend-id-1" }, error: null });
    tableResults = {};
    process.env.CRON_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test.com";
  });

  it("returns 401 without valid auth header", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns early with sent:0 when no events have recovery enabled", async () => {
    tableResults["events"] = [{ data: [], error: null }];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  it("skips intents where delay hasn't elapsed yet", async () => {
    const event = makeEvent({ recovery_delay_hours: 1 });
    // Intent created 30 min ago — delay is 1 hour so should be skipped
    const intent = makeIntent({
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      recovery_emails_sent: 0,
    });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [{ data: [intent], error: null }];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends recovery email when delay has elapsed", async () => {
    const event = makeEvent({ recovery_delay_hours: 1 });
    // Intent created 2 hours ago, delay is 1 hour — should send
    const intent = makeIntent({
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 0,
    });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [{ data: [intent], error: null }];
    // registrations check (no existing registration)
    tableResults["registrations"] = [{ data: [], error: null }];
    // email_logs insert
    tableResults["email_logs"] = [{ data: null, error: null }];
    // registration_intents update
    tableResults["registration_intents"].push({ data: null, error: null });

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        html: "<html>test</html>",
      })
    );
  });

  it("skips duplicate sends within 1 hour", async () => {
    const event = makeEvent({ recovery_delay_hours: 1 });
    // Intent created 3 hours ago, but last email was 30 min ago
    const intent = makeIntent({
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 1,
      last_recovery_email_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [{ data: [intent], error: null }];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("auto-converts intent when user already registered", async () => {
    const event = makeEvent({ recovery_delay_hours: 1 });
    const intent = makeIntent({
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 0,
    });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [
      { data: [intent], error: null },
      // The update call for converting the intent
      { data: null, error: null },
    ];
    // Existing registration found
    tableResults["registrations"] = [
      { data: [{ id: "reg-1" }], error: null },
    ];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();

    // Verify the update call was made to registration_intents with "converted"
    const updateCalls = mockFrom.mock.calls.filter(
      (c) => c[0] === "registration_intents"
    );
    // First call is the select, second is the update
    expect(updateCalls.length).toBe(2);
  });

  it("uses correct subject lines based on emailIndex", async () => {
    const event = makeEvent({ recovery_delay_hours: 1, recovery_email_count: 3 });

    const subjects: string[] = [];
    mockSend.mockImplementation(async (opts: any) => {
      subjects.push(opts.subject);
      return { data: { id: "resend-id" }, error: null };
    });

    // Test emailIndex 0
    const intent0 = makeIntent({
      id: "intent-0",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 0,
    });
    // Test emailIndex 1 — RECOVERY_SCHEDULE[1] = 24 hours, so need 25 hours of delay
    const intent1 = makeIntent({
      id: "intent-1",
      email: "user1@example.com",
      created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 1,
      last_recovery_email_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });
    // Test emailIndex 2 — RECOVERY_SCHEDULE[2] = 72 hours, so need 73 hours of delay
    const intent2 = makeIntent({
      id: "intent-2",
      email: "user2@example.com",
      created_at: new Date(Date.now() - 74 * 60 * 60 * 1000).toISOString(),
      recovery_emails_sent: 2,
      last_recovery_email_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [
      { data: [intent0, intent1, intent2], error: null },
      // 3 updates for tracking
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ];
    tableResults["registrations"] = [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ];
    tableResults["email_logs"] = [
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(3);

    expect(subjects[0]).toBe("Complete your registration for Test Event");
    expect(subjects[1]).toBe("Your spot is still available — Test Event");
    expect(subjects[2]).toBe("Last chance to register for Test Event");
  });

  it("respects recovery_email_count — only fetches intents where recovery_emails_sent < count", async () => {
    const event = makeEvent({ recovery_email_count: 2 });

    tableResults["events"] = [{ data: [event], error: null }];
    tableResults["registration_intents"] = [{ data: [], error: null }];

    const { GET } = await import("./route");
    await GET(makeRequest());

    // Find the .from("registration_intents") call and verify .lt was called
    const riCalls = mockFrom.mock.results.filter(
      (_r: any, i: number) => mockFrom.mock.calls[i][0] === "registration_intents"
    );
    expect(riCalls.length).toBeGreaterThan(0);
    const chain = riCalls[0].value;
    expect(chain.lt).toHaveBeenCalledWith("recovery_emails_sent", 2);
  });

  it("skips events that have already ended", async () => {
    // Event ended yesterday
    const event = makeEvent({
      end_date: new Date(Date.now() - 86400000).toISOString(),
    });

    tableResults["events"] = [{ data: [event], error: null }];

    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.sent).toBe(0);
    // Should never query registration_intents since event is skipped
    const riCalls = mockFrom.mock.calls.filter(
      (c) => c[0] === "registration_intents"
    );
    expect(riCalls.length).toBe(0);
  });
});
