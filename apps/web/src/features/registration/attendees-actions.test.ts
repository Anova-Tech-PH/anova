import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom, auth: mockAuth })
  ),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-qr-code-123"),
}));

describe("addAttendee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("inserts a new attendee with all fields", async () => {
    const fromCalls: string[] = [];
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      fromCalls.push(table);
      return createQueryMock({ data: null, error: null });
    });

    const { addAttendee } = await import("./attendees-actions");
    await addAttendee("evt-1", {
      name: "John Doe",
      email: "john@test.com",
      title: "Pastor",
      company: "Church Inc",
      category: "Speaker",
    });

    expect(fromCalls).toContain("registrations");
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/registrations");
  });

  it("requires name and email", async () => {
    const { addAttendee } = await import("./attendees-actions");

    await expect(
      addAttendee("evt-1", { name: "", email: "john@test.com" })
    ).rejects.toThrow("Name is required");

    await expect(
      addAttendee("evt-1", { name: "John", email: "" })
    ).rejects.toThrow("Email is required");
  });

  it("throws when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { addAttendee } = await import("./attendees-actions");
    await expect(
      addAttendee("evt-1", { name: "John", email: "john@test.com" })
    ).rejects.toThrow("Authentication required");
  });

  it("throws on supabase insert error", async () => {
    mockFrom.mockReturnValue(
      createQueryMock({ data: null, error: { message: "Duplicate email" } })
    );

    const { addAttendee } = await import("./attendees-actions");
    await expect(
      addAttendee("evt-1", { name: "John", email: "john@test.com" })
    ).rejects.toThrow("Duplicate email");
  });
});

describe("importAttendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("parses CSV and inserts multiple attendees", async () => {
    const fromCalls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      fromCalls.push(table);
      return createQueryMock({ data: null, error: null });
    });

    const csv = `name,email,title,company,category
John Doe,john@test.com,Pastor,Church Inc,Speaker
Jane Smith,jane@test.com,,EQUIP 210,Staff`;

    const { importAttendees } = await import("./attendees-actions");
    const result = await importAttendees("evt-1", csv);

    expect(result.imported).toBe(2);
    expect(result.errors).toEqual([]);
    expect(fromCalls.filter((t) => t === "registrations").length).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/registrations");
  });

  it("requires name and email columns in CSV", async () => {
    const csv = `title,company
Pastor,Church Inc`;

    const { importAttendees } = await import("./attendees-actions");
    await expect(importAttendees("evt-1", csv)).rejects.toThrow(
      "CSV must have name and email columns"
    );
  });

  it("skips rows with missing name or email and reports errors", async () => {
    mockFrom.mockImplementation(() =>
      createQueryMock({ data: null, error: null })
    );

    const csv = `name,email,title
John Doe,john@test.com,Pastor
,missing-name@test.com,
No Email,,Staff`;

    const { importAttendees } = await import("./attendees-actions");
    const result = await importAttendees("evt-1", csv);

    expect(result.imported).toBe(1);
    expect(result.errors.length).toBe(2);
  });

  it("throws when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { importAttendees } = await import("./attendees-actions");
    await expect(importAttendees("evt-1", "name,email\nJohn,j@t.com")).rejects.toThrow(
      "Authentication required"
    );
  });
});
