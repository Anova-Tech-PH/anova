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
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
  signUp: vi.fn(),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

// Mock @supabase/supabase-js for createAttendeeAccount's admin client
const mockAdminFrom = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

describe("Attendee Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("createAttendeeAccount", () => {
    it("signs up and links registrations", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: "new-user" } },
        error: null,
      });
      mockAdminFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { createAttendeeAccount } = await import("./actions");
      const result = await createAttendeeAccount({
        email: "new@test.com",
        password: "password123",
        fullName: "New User",
      });

      expect(result).toEqual({ userId: "new-user" });
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "password123",
        options: { data: { full_name: "New User" } },
      });
    });

    it("throws on signup error", async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "Email taken" },
      });

      const { createAttendeeAccount } = await import("./actions");
      await expect(
        createAttendeeAccount({ email: "x@test.com", password: "p", fullName: "X" })
      ).rejects.toThrow("Email taken");
    });
  });

  describe("toggleSessionBookmark", () => {
    it("adds bookmark when not existing", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleSessionBookmark } = await import("./actions");
      const result = await toggleSessionBookmark("sess-1");

      expect(result).toEqual({ bookmarked: true });
      expect(revalidatePath).toHaveBeenCalledWith("/my/schedule");
    });

    it("removes bookmark when existing", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: { user_id: "user-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleSessionBookmark } = await import("./actions");
      const result = await toggleSessionBookmark("sess-1");

      expect(result).toEqual({ bookmarked: false });
    });
  });

  describe("updateMyProfile", () => {
    it("updates profile and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateMyProfile } = await import("./actions");
      await updateMyProfile({ full_name: "Updated Name", bio: "Hello" });

      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(revalidatePath).toHaveBeenCalledWith("/my/profile");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { updateMyProfile } = await import("./actions");
      await expect(updateMyProfile({ full_name: "X" })).rejects.toThrow("Authentication required");
    });
  });
});
