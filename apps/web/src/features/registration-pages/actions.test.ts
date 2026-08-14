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
  createRegistrationPage,
  updateRegistrationPage,
  deleteRegistrationPage,
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

describe("createRegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if name is empty", async () => {
    await expect(
      createRegistrationPage("event-1", { name: "", ticket_type_ids: [] })
    ).rejects.toThrow("Name is required");
  });

  it("throws if name is only whitespace", async () => {
    await expect(
      createRegistrationPage("event-1", { name: "   ", ticket_type_ids: [] })
    ).rejects.toThrow("Name is required");
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      createRegistrationPage("event-1", {
        name: "VIP Page",
        ticket_type_ids: [],
      })
    ).rejects.toThrow("Authentication required");
  });

  it("auto-generates slug from name", async () => {
    const createdPage = {
      id: "page-1",
      event_id: "event-1",
      name: "VIP Registration",
      slug: "vip-registration",
      ticket_type_ids: [],
      is_default: false,
      created_at: "2026-01-01T00:00:00Z",
    };

    const fromMock = vi.fn(() =>
      createQueryMock({ data: createdPage, error: null })
    );
    mockAuthenticatedClient(fromMock);

    const result = await createRegistrationPage("event-1", {
      name: "VIP Registration",
      ticket_type_ids: [],
    });

    expect(result).toEqual(createdPage);
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-pages"
    );
  });

  it("uses provided slug when given", async () => {
    const createdPage = {
      id: "page-1",
      event_id: "event-1",
      name: "VIP Page",
      slug: "custom-slug",
      ticket_type_ids: ["ticket-1"],
      is_default: false,
      created_at: "2026-01-01T00:00:00Z",
    };

    const fromMock = vi.fn(() =>
      createQueryMock({ data: createdPage, error: null })
    );
    mockAuthenticatedClient(fromMock);

    const result = await createRegistrationPage("event-1", {
      name: "VIP Page",
      slug: "custom-slug",
      ticket_type_ids: ["ticket-1"],
    });

    expect(result).toEqual(createdPage);
  });

  it("throws user-friendly error on duplicate slug", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({
        data: null,
        error: { message: "duplicate key value", code: "23505" },
      })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      createRegistrationPage("event-1", {
        name: "VIP Page",
        slug: "existing-slug",
        ticket_type_ids: [],
      })
    ).rejects.toThrow("A registration page with this slug already exists");
  });

  it("throws on other supabase insert errors", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Insert failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      createRegistrationPage("event-1", {
        name: "VIP Page",
        ticket_type_ids: [],
      })
    ).rejects.toThrow("Insert failed");
  });
});

describe("updateRegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      updateRegistrationPage("event-1", "page-1", { name: "Updated" })
    ).rejects.toThrow("Authentication required");
  });

  it("updates page and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await updateRegistrationPage("event-1", "page-1", {
      name: "Updated Page",
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-pages"
    );
  });

  it("throws on supabase update error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Update failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      updateRegistrationPage("event-1", "page-1", { name: "X" })
    ).rejects.toThrow("Update failed");
  });
});

describe("deleteRegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      deleteRegistrationPage("event-1", "page-1")
    ).rejects.toThrow("Authentication required");
  });

  it("deletes page and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await deleteRegistrationPage("event-1", "page-1");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/registration-pages"
    );
  });

  it("throws on supabase delete error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Delete failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      deleteRegistrationPage("event-1", "page-1")
    ).rejects.toThrow("Delete failed");
  });
});
