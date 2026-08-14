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

import {
  updateRegistrationSettings,
  addToWaitlist,
  removeFromWaitlist,
} from "./actions";

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

describe("updateRegistrationSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      updateRegistrationSettings("event-1", { capacity_limit: 100 })
    ).rejects.toThrow("Authentication required");
  });

  it("updates settings and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    const settings = {
      registration_open: "2026-01-01T09:00",
      capacity_limit: 500,
      waitlist_enabled: true,
    };

    await updateRegistrationSettings("event-1", settings);
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-settings"
    );
  });

  it("throws on supabase update error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Update failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      updateRegistrationSettings("event-1", { capacity_limit: 100 })
    ).rejects.toThrow("Update failed");
  });
});

describe("addToWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if email is empty", async () => {
    await expect(
      addToWaitlist("event-1", { email: "", name: "Alice" })
    ).rejects.toThrow("Email is required");
  });

  it("throws if email is only whitespace", async () => {
    await expect(
      addToWaitlist("event-1", { email: "   ", name: "Alice" })
    ).rejects.toThrow("Email is required");
  });

  it("throws if name is empty", async () => {
    await expect(
      addToWaitlist("event-1", { email: "alice@example.com", name: "" })
    ).rejects.toThrow("Name is required");
  });

  it("throws if name is only whitespace", async () => {
    await expect(
      addToWaitlist("event-1", { email: "alice@example.com", name: "   " })
    ).rejects.toThrow("Name is required");
  });

  it("handles duplicate email error", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() =>
        createQueryMock({
          data: null,
          error: { code: "23505", message: "duplicate key" },
        })
      ),
    });

    await expect(
      addToWaitlist("event-1", {
        email: "alice@example.com",
        name: "Alice",
      })
    ).rejects.toThrow("Email already on waitlist");
  });

  it("inserts entry and revalidates", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => createQueryMock({ data: null, error: null })),
    });

    await addToWaitlist("event-1", {
      email: "  Alice@Example.com  ",
      name: "  Alice Smith  ",
    });

    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-settings"
    );
  });

  it("throws on supabase insert error", async () => {
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() =>
        createQueryMock({
          data: null,
          error: { code: "42501", message: "Insert failed" },
        })
      ),
    });

    await expect(
      addToWaitlist("event-1", {
        email: "alice@example.com",
        name: "Alice",
      })
    ).rejects.toThrow("Insert failed");
  });
});

describe("removeFromWaitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      removeFromWaitlist("event-1", "entry-1")
    ).rejects.toThrow("Authentication required");
  });

  it("deletes entry and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await removeFromWaitlist("event-1", "entry-1");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-settings"
    );
  });

  it("throws on supabase delete error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Delete failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      removeFromWaitlist("event-1", "entry-1")
    ).rejects.toThrow("Delete failed");
  });
});
