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

import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

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

describe("createTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if subject is empty", async () => {
    await expect(
      createTemplate("event-1", { subject: "", body: "Hello" })
    ).rejects.toThrow("Subject is required");
  });

  it("throws if subject is only whitespace", async () => {
    await expect(
      createTemplate("event-1", { subject: "   ", body: "Hello" })
    ).rejects.toThrow("Subject is required");
  });

  it("throws if body is empty", async () => {
    await expect(
      createTemplate("event-1", { subject: "Welcome", body: "" })
    ).rejects.toThrow("Body is required");
  });

  it("throws if body is only whitespace", async () => {
    await expect(
      createTemplate("event-1", { subject: "Welcome", body: "   " })
    ).rejects.toThrow("Body is required");
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      createTemplate("event-1", { subject: "Welcome", body: "Hello {{name}}" })
    ).rejects.toThrow("Authentication required");
  });

  it("creates template with correct data and revalidates", async () => {
    const createdTemplate = {
      id: "tpl-1",
      event_id: "event-1",
      ticket_type_id: null,
      subject: "Welcome",
      body: "Hello {{name}}",
      enabled: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const fromMock = vi.fn(() =>
      createQueryMock({ data: createdTemplate, error: null })
    );
    mockAuthenticatedClient(fromMock);

    const result = await createTemplate("event-1", {
      subject: "Welcome",
      body: "Hello {{name}}",
    });

    expect(result).toEqual(createdTemplate);
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/confirmation-emails"
    );
  });

  it("handles duplicate constraint error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({
        data: null,
        error: { code: "23505", message: "unique constraint violation" },
      })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      createTemplate("event-1", { subject: "Welcome", body: "Hello" })
    ).rejects.toThrow("A template for this ticket type already exists");
  });

  it("throws on other supabase insert error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Insert failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      createTemplate("event-1", { subject: "Welcome", body: "Hello" })
    ).rejects.toThrow("Insert failed");
  });
});

describe("updateTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(
      updateTemplate("event-1", "tpl-1", { subject: "Updated" })
    ).rejects.toThrow("Authentication required");
  });

  it("updates template and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await updateTemplate("event-1", "tpl-1", { subject: "Updated Welcome" });
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/confirmation-emails"
    );
  });

  it("throws on supabase update error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Update failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(
      updateTemplate("event-1", "tpl-1", { subject: "X" })
    ).rejects.toThrow("Update failed");
  });
});

describe("deleteTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if not authenticated", async () => {
    mockUnauthenticatedClient();

    await expect(deleteTemplate("event-1", "tpl-1")).rejects.toThrow(
      "Authentication required"
    );
  });

  it("deletes template and revalidates", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: null })
    );
    mockAuthenticatedClient(fromMock);

    await deleteTemplate("event-1", "tpl-1");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/events/event-1/confirmation-emails"
    );
  });

  it("throws on supabase delete error", async () => {
    const fromMock = vi.fn(() =>
      createQueryMock({ data: null, error: { message: "Delete failed" } })
    );
    mockAuthenticatedClient(fromMock);

    await expect(deleteTemplate("event-1", "tpl-1")).rejects.toThrow(
      "Delete failed"
    );
  });
});
