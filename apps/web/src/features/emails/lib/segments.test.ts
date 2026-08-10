import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client — registrations chain ends with .order() returning data,
// while check_ins chain ends with .eq() returning data (no .order call).
function createRegistrationsChain(finalData: any[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: finalData, error: null }),
  };
  return chain;
}

function createCheckInsChain(finalData: any[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: finalData, error: null }),
  };
  return chain;
}

let registrationsChain: any;
let checkInsChain: any;

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "registrations") return registrationsChain;
      if (table === "check_ins") return checkInsChain;
      return createRegistrationsChain();
    }),
  })),
}));

const { getSegmentedRecipients } = await import("./segments");

describe("getSegmentedRecipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all registrations when no filters applied", async () => {
    const mockData = [
      { id: "r1", name: "Alice", email: "a@a.com", status: "confirmed", ticket_type_id: "t1", custom_fields: {}, ticket_types: { name: "GA" } },
      { id: "r2", name: "Bob", email: "b@b.com", status: "checked_in", ticket_type_id: "t2", custom_fields: {}, ticket_types: { name: "VIP" } },
    ];
    registrationsChain = createRegistrationsChain(mockData);

    const result = await getSegmentedRecipients("event-1");
    expect(result).toHaveLength(2);
  });

  it("filters by custom_field_filters", async () => {
    const mockData = [
      { id: "r1", name: "Alice", email: "a@a.com", status: "confirmed", ticket_type_id: "t1", custom_fields: { dietary: "Vegetarian" }, ticket_types: { name: "GA" } },
      { id: "r2", name: "Bob", email: "b@b.com", status: "confirmed", ticket_type_id: "t1", custom_fields: { dietary: "None" }, ticket_types: { name: "GA" } },
      { id: "r3", name: "Carol", email: "c@c.com", status: "confirmed", ticket_type_id: "t1", custom_fields: {}, ticket_types: { name: "GA" } },
    ];
    registrationsChain = createRegistrationsChain(mockData);

    const result = await getSegmentedRecipients("event-1", {
      custom_field_filters: [{ field_id: "dietary", value: "Vegetarian" }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("filters by min_check_ins", async () => {
    const mockRegistrations = [
      { id: "r1", name: "Alice", email: "a@a.com", status: "confirmed", ticket_type_id: "t1", custom_fields: {}, ticket_types: { name: "GA" } },
      { id: "r2", name: "Bob", email: "b@b.com", status: "confirmed", ticket_type_id: "t1", custom_fields: {}, ticket_types: { name: "GA" } },
    ];
    registrationsChain = createRegistrationsChain(mockRegistrations);

    const mockCheckIns = [
      { registration_id: "r1" },
      { registration_id: "r1" },
      { registration_id: "r1" },
      { registration_id: "r2" },
    ];
    checkInsChain = createCheckInsChain(mockCheckIns);

    const result = await getSegmentedRecipients("event-1", {
      min_check_ins: 3,
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("combines custom field and min check-ins filters", async () => {
    const mockRegistrations = [
      { id: "r1", name: "Alice", email: "a@a.com", status: "confirmed", ticket_type_id: "t1", custom_fields: { role: "Speaker" }, ticket_types: { name: "GA" } },
      { id: "r2", name: "Bob", email: "b@b.com", status: "confirmed", ticket_type_id: "t1", custom_fields: { role: "Speaker" }, ticket_types: { name: "GA" } },
      { id: "r3", name: "Carol", email: "c@c.com", status: "confirmed", ticket_type_id: "t1", custom_fields: { role: "Attendee" }, ticket_types: { name: "GA" } },
    ];
    registrationsChain = createRegistrationsChain(mockRegistrations);

    const mockCheckIns = [
      { registration_id: "r1" },
      { registration_id: "r1" },
      { registration_id: "r2" },
      { registration_id: "r3" },
      { registration_id: "r3" },
    ];
    checkInsChain = createCheckInsChain(mockCheckIns);

    const result = await getSegmentedRecipients("event-1", {
      custom_field_filters: [{ field_id: "role", value: "Speaker" }],
      min_check_ins: 2,
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
});
