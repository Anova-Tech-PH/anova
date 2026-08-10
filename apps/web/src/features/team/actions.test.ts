import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, rpc: mockRpc, auth: mockAuth })),
}));

describe("Team Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("inviteTeamMember", () => {
    it("invites a member successfully", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { role: "owner" } });
        if (callIdx === 2) return createQueryMock({ data: null });
        return createQueryMock({ data: null, error: null });
      });
      mockRpc.mockReturnValue(createQueryMock({ data: { id: "target-user" } }));

      const { inviteTeamMember } = await import("./actions");
      await inviteTeamMember("org-1", "member@test.com", "editor");

      expect(mockFrom).toHaveBeenCalledWith("organization_members");
      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });

    it("rejects invalid role", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: { role: "owner" } }));

      const { inviteTeamMember } = await import("./actions");
      await expect(inviteTeamMember("org-1", "x@test.com", "superadmin")).rejects.toThrow(
        "Invalid role"
      );
    });

    it("rejects non-admin callers", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: { role: "viewer" } }));

      const { inviteTeamMember } = await import("./actions");
      await expect(inviteTeamMember("org-1", "x@test.com", "editor")).rejects.toThrow(
        "Only owners and admins"
      );
    });
  });

  describe("updateMemberRole", () => {
    it("updates role and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { role: "admin" } });
        if (callIdx === 2) return createQueryMock({ data: { role: "editor" } });
        return createQueryMock({ data: null, error: null });
      });

      const { updateMemberRole } = await import("./actions");
      await updateMemberRole("org-1", "member-1", "viewer");

      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });

    it("prevents changing owner role", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { role: "admin" } });
        return createQueryMock({ data: { role: "owner" } });
      });

      const { updateMemberRole } = await import("./actions");
      await expect(updateMemberRole("org-1", "member-1", "viewer")).rejects.toThrow(
        "Cannot change the owner's role"
      );
    });
  });

  describe("removeMember", () => {
    it("removes member and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { role: "owner" } });
        if (callIdx === 2) return createQueryMock({ data: { role: "editor" } });
        return createQueryMock({ data: null, error: null });
      });

      const { removeMember } = await import("./actions");
      await removeMember("org-1", "member-1");

      expect(revalidatePath).toHaveBeenCalledWith("/settings/team");
    });

    it("prevents removing owner", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) return createQueryMock({ data: { role: "admin" } });
        return createQueryMock({ data: { role: "owner" } });
      });

      const { removeMember } = await import("./actions");
      await expect(removeMember("org-1", "member-1")).rejects.toThrow("Cannot remove the owner");
    });
  });
});
