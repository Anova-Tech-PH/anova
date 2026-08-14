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

describe("Messaging Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  describe("sendMessage", () => {
    it("inserts a direct message successfully", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { sendMessage } = await import("./actions");
      await sendMessage("evt-1", "user-2", "Hello there!");

      expect(mockFrom).toHaveBeenCalledWith("direct_messages");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { sendMessage } = await import("./actions");
      await expect(sendMessage("evt-1", "user-2", "Hi")).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("throws when content is empty", async () => {
      const { sendMessage } = await import("./actions");
      await expect(sendMessage("evt-1", "user-2", "   ")).rejects.toThrow(
        "Message cannot be empty"
      );
    });

    it("throws on supabase insert error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "RLS violation", code: "42501" } })
      );

      const { sendMessage } = await import("./actions");
      await expect(sendMessage("evt-1", "user-2", "Hello")).rejects.toThrow();
    });
  });

  describe("markMessagesRead", () => {
    it("updates read_at for unread messages from the other user", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { markMessagesRead } = await import("./actions");
      await markMessagesRead("evt-1", "user-2");

      expect(mockFrom).toHaveBeenCalledWith("direct_messages");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { markMessagesRead } = await import("./actions");
      await expect(markMessagesRead("evt-1", "user-2")).rejects.toThrow(
        "Not authenticated"
      );
    });
  });
});
