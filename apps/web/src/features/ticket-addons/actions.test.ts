import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

// Proxy-based Supabase mock
function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then")
        return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockCreateClient = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import { createAddon, updateAddon, deleteAddon } from "./actions";

function mockAuthenticatedClient(fromMock: ReturnType<typeof vi.fn>) {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
    from: fromMock,
  });
}

function mockUnauthenticatedClient() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
    from: vi.fn(),
  });
}

describe("createAddon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if name is empty", async () => {
    await expect(
      createAddon("event-1", { name: "", price: 10 })
    ).rejects.toThrow("Name is required");
  });

  it("throws if name is only whitespace", async () => {
    await expect(
      createAddon("event-1", { name: "   ", price: 10 })
    ).rejects.toThrow("Name is required");
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      createAddon("event-1", { name: "T-Shirt", price: 25 })
    ).rejects.toThrow("Authentication required");
  });

  it("creates addon with correct data and revalidates", async () => {
    const createdAddon = {
      id: "addon-1",
      event_id: "event-1",
      name: "T-Shirt",
      description: null,
      price: 25,
      quantity: null,
      applies_to_tickets: null,
      sort_order: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const fromMock = vi.fn((table: string) => {
      if (table === "ticket_addons") {
        // First call is for existing sort_order query, second for insert
        // The proxy handles chaining for both
        return createQueryMock({ data: createdAddon, error: null });
      }
      return createQueryMock({ data: [], error: null });
    });

    mockAuthenticatedClient(fromMock);

    const result = await createAddon("event-1", {
      name: "T-Shirt",
      price: 25,
    });

    expect(result).toEqual(createdAddon);
    expect(revalidatePath).toHaveBeenCalledWith("/events/event-1/ticket-addons");
  });

  it("throws on supabase insert error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Insert failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      createAddon("event-1", { name: "T-Shirt", price: 25 })
    ).rejects.toThrow("Insert failed");
  });
});

describe("updateAddon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      updateAddon("event-1", "addon-1", { name: "Updated" })
    ).rejects.toThrow("Authentication required");
  });

  it("updates addon and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await updateAddon("event-1", "addon-1", { name: "Updated T-Shirt" });
    expect(revalidatePath).toHaveBeenCalledWith("/events/event-1/ticket-addons");
  });

  it("throws on supabase update error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Update failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      updateAddon("event-1", "addon-1", { name: "X" })
    ).rejects.toThrow("Update failed");
  });
});

describe("deleteAddon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(deleteAddon("event-1", "addon-1")).rejects.toThrow(
      "Authentication required"
    );
  });

  it("deletes addon and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await deleteAddon("event-1", "addon-1");
    expect(revalidatePath).toHaveBeenCalledWith("/events/event-1/ticket-addons");
  });

  it("throws on supabase delete error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Delete failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(deleteAddon("event-1", "addon-1")).rejects.toThrow(
      "Delete failed"
    );
  });
});
