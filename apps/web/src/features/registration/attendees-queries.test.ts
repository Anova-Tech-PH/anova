import { describe, it, expect, vi, beforeEach } from "vitest";

function createQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const terminal = {
    then: (
      resolve: (v: unknown) => void,
      reject?: (e: unknown) => void
    ) => Promise.resolve(resolvedValue).then(resolve, reject),
  };

  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["from", "select", "eq", "ilike", "or", "order", "range", "not"]) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  // range() is the terminal call for getAttendees
  builder.range.mockReturnValue({ ...builder, ...terminal });
  // order() can also be terminal when no range follows
  builder.order.mockReturnValue({ ...builder, ...terminal });
  // eq() terminal for getAttendeeCategories
  builder.eq.mockReturnValue({ ...builder, ...terminal });

  return builder;
}

const mockCreateClient = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe("getAttendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated attendees with total count", async () => {
    const attendees = [
      {
        id: "reg-1",
        name: "John Doe",
        email: "john@test.com",
        title: "Pastor",
        company: "Church Inc",
        category: "Speaker",
        status: "confirmed",
        user_id: "user-1",
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "reg-2",
        name: "Jane Smith",
        email: "jane@test.com",
        title: null,
        company: null,
        category: null,
        status: "confirmed",
        user_id: null,
        created_at: "2025-01-02T00:00:00Z",
      },
    ];
    const builder = createQueryBuilder({ data: attendees, error: null, count: 50 });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    const result = await getAttendees("evt-1", { page: 1, pageSize: 10 });

    expect(result.data).toEqual(attendees);
    expect(result.total).toBe(50);
    expect(builder.from).toHaveBeenCalledWith("registrations");
    expect(builder.select).toHaveBeenCalledWith(
      "id, name, email, title, company, category, status, user_id, created_at",
      { count: "exact" }
    );
    expect(builder.eq).toHaveBeenCalledWith("event_id", "evt-1");
    expect(builder.range).toHaveBeenCalledWith(0, 9);
  });

  it("applies category filter", async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    await getAttendees("evt-1", { page: 1, pageSize: 10, category: "Speaker" });

    expect(builder.eq).toHaveBeenCalledWith("category", "Speaker");
  });

  it("applies search filter across name, email, title, company", async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    await getAttendees("evt-1", { page: 1, pageSize: 10, search: "john" });

    expect(builder.or).toHaveBeenCalledWith(
      "name.ilike.%john%,email.ilike.%john%,title.ilike.%john%,company.ilike.%john%"
    );
  });

  it("calculates correct range for page 3", async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    await getAttendees("evt-1", { page: 3, pageSize: 10 });

    expect(builder.range).toHaveBeenCalledWith(20, 29);
  });

  it("excludes cancelled registrations", async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    await getAttendees("evt-1", { page: 1, pageSize: 10 });

    expect(builder.not).toHaveBeenCalledWith("status", "eq", "cancelled");
  });

  it("throws on supabase error", async () => {
    const builder = createQueryBuilder({ data: null, error: { message: "DB error" } });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendees } = await import("./attendees-queries");
    await expect(getAttendees("evt-1", { page: 1, pageSize: 10 })).rejects.toThrow("DB error");
  });
});

describe("getAttendeeCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unique non-null categories", async () => {
    const rows = [
      { category: "Speaker" },
      { category: "Organizer" },
      { category: "Staff" },
      { category: null },
    ];
    const builder = createQueryBuilder({ data: rows, error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendeeCategories } = await import("./attendees-queries");
    const result = await getAttendeeCategories("evt-1");

    expect(result).toEqual(["Speaker", "Organizer", "Staff"]);
    expect(builder.from).toHaveBeenCalledWith("registrations");
    expect(builder.eq).toHaveBeenCalledWith("event_id", "evt-1");
  });
});

describe("getAttendeeStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct stats", async () => {
    const registrations = [
      { status: "confirmed", user_id: "u1", email: "a@b.com" },
      { status: "confirmed", user_id: null, email: "c@d.com" },
      { status: "checked_in", user_id: "u2", email: "e@f.com" },
      { status: "pending", user_id: null, email: null },
      { status: "cancelled", user_id: null, email: "g@h.com" },
    ];
    const builder = createQueryBuilder({ data: registrations, error: null });
    mockCreateClient.mockResolvedValue({ from: builder.from });

    const { getAttendeeStats } = await import("./attendees-queries");
    const result = await getAttendeeStats("evt-1");

    expect(result).toEqual({
      total: 5,
      withEmail: 4,
      signedIn: 2,
    });
  });
});
