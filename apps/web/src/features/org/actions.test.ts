import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

function createQueryMock(result: { data?: unknown; error?: unknown; count?: number }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("deleteOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("throws when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { deleteOrganization } = await import("./actions");
    await expect(deleteOrganization("org-1")).rejects.toThrow("Not authenticated");
  });

  it("throws when user is not the owner", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      // 1st call: check membership role
      if (callIdx === 1) return createQueryMock({ data: { role: "admin" } });
      return createQueryMock({ data: null });
    });

    const { deleteOrganization } = await import("./actions");
    await expect(deleteOrganization("org-1")).rejects.toThrow(
      "Only the owner can delete an organization"
    );
  });

  it("throws when organization has events", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      // 1st call: check membership role — owner
      if (callIdx === 1) return createQueryMock({ data: { role: "owner" } });
      // 2nd call: count events — has 3
      if (callIdx === 2) return createQueryMock({ count: 3, data: null, error: null });
      return createQueryMock({ data: null });
    });

    const { deleteOrganization } = await import("./actions");
    await expect(deleteOrganization("org-1")).rejects.toThrow(
      "Cannot delete an organization that has events"
    );
  });

  it("deletes organization with no events and redirects", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      // 1st call: check membership role — owner
      if (callIdx === 1) return createQueryMock({ data: { role: "owner" } });
      // 2nd call: count events — 0
      if (callIdx === 2) return createQueryMock({ count: 0, data: null, error: null });
      // 3rd call: delete org
      return createQueryMock({ data: null, error: null });
    });

    const { deleteOrganization } = await import("./actions");
    await deleteOrganization("org-1");

    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("throws when delete fails with database error", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return createQueryMock({ data: { role: "owner" } });
      if (callIdx === 2) return createQueryMock({ count: 0, data: null, error: null });
      return createQueryMock({ data: null, error: { message: "FK constraint violation" } });
    });

    const { deleteOrganization } = await import("./actions");
    await expect(deleteOrganization("org-1")).rejects.toThrow("FK constraint violation");
  });
});
